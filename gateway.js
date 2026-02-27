#!/usr/bin/env node
// ~/.claude/mcpflip/gateway.js
//
// Generic MCP Gateway
// - Pre-warms all configured servers at startup (handshake + tool fetch)
// - Holds tools internally — nothing injected into Claude's context yet
// - On activate: injects that server's tools via list_changed
// - On deactivate: removes tools, context clean again
//
// Always-visible tools (3): mcpflip_activate, mcpflip_deactivate, mcpflip_status
// Add new servers by editing servers.json — no code changes needed

const { spawn } = require('child_process');
const readline  = require('readline');
const path      = require('path');
const fs        = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'servers.json'), 'utf8')
);

// ─── State ────────────────────────────────────────────────────────────────────
// servers[alias] = { process, tools, nextId, pending, ready, active, error }

const servers = {};

// ─── Gateway tools (always in context) ───────────────────────────────────────

const GATEWAY_TOOLS = [
  {
    name: 'mcpflip_activate',
    description:
      'Activate an MCP server and inject its tools into context. ' +
      'Available servers: ' + Object.keys(CONFIG).join(', ') + '. ' +
      'Only call this when explicitly instructed by the user via /activate.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Server alias to activate' },
      },
      required: ['name'],
    },
  },
  {
    name: 'mcpflip_deactivate',
    description:
      'Deactivate an MCP server and remove its tools from context. ' +
      'Only call this when explicitly instructed by the user via /deactivate.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Server alias to deactivate' },
      },
      required: ['name'],
    },
  },
  {
    name: 'mcpflip_status',
    description: 'List all configured servers and their current status (active / ready / error).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

// ─── Active tools builder ─────────────────────────────────────────────────────

function buildActiveTools() {
  const injected = Object.values(servers)
    .filter(s => s.active && s.tools?.length)
    .flatMap(s => s.tools);
  return [...GATEWAY_TOOLS, ...injected];
}

let activeTools = [...GATEWAY_TOOLS];

// ─── Write to Claude Code ─────────────────────────────────────────────────────

function toClient(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

// ─── MCP client helpers (one per server) ─────────────────────────────────────

function sendToServer(alias, msg) {
  servers[alias]?.process?.stdin.write(JSON.stringify(msg) + '\n');
}

function serverRequest(alias, method, params) {
  return new Promise((resolve, reject) => {
    const s = servers[alias];
    const id = s.nextId++;
    const timer = setTimeout(() => {
      delete s.pending[id];
      reject(new Error(`Timeout: ${method}`));
    }, 30000);
    s.pending[id] = {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject:  (e) => { clearTimeout(timer); reject(e);  },
    };
    sendToServer(alias, { jsonrpc: '2.0', id, method, params });
  });
}

// ─── Pre-warm a single server ─────────────────────────────────────────────────

async function prewarmServer(alias) {
  const cfg = CONFIG[alias];
  const s   = { process: null, tools: [], nextId: 1, pending: {}, ready: false, active: false };
  servers[alias] = s;

  const expandedArgs = (cfg.args || []).map(arg =>
    arg.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, (_, name) => process.env[name] ?? '')
  );
  const proc = spawn(cfg.command, expandedArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
  s.process = proc;
  proc.stderr.on('data', () => {}); // suppress npx noise

  const rl = readline.createInterface({ input: proc.stdout });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.id && s.pending[msg.id]) {
        const { resolve, reject } = s.pending[msg.id];
        delete s.pending[msg.id];
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    } catch (_) {}
  });

  proc.on('exit', () => {
    s.ready  = false;
    s.active = false;
    s.tools  = [];
    s.error  = 'process exited unexpectedly';
    activeTools = buildActiveTools();
    toClient({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
  });

  // MCP handshake
  await serverRequest(alias, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcpflip', version: '1.0' },
  });
  sendToServer(alias, { jsonrpc: '2.0', method: 'notifications/initialized' });

  // Fetch and cache tool list
  const result = await serverRequest(alias, 'tools/list', {});
  s.tools = result.tools || [];
  s.ready = true;
}

// ─── Activate / Deactivate / Status ──────────────────────────────────────────

function activate(alias) {
  const s = servers[alias];
  if (!s)        return `Unknown server "${alias}". Run mcpflip_status to see available servers.`;
  if (!s.ready)  return `Server "${alias}" is not ready yet — still warming up or failed.`;
  if (s.active)  return `Server "${alias}" is already active (${s.tools.length} tools in context).`;
  s.active    = true;
  activeTools = buildActiveTools();
  toClient({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
  return `Activated "${alias}" — ${s.tools.length} tools injected into context.`;
}

function deactivate(alias) {
  const s = servers[alias];
  if (!s?.active) return `Server "${alias}" is not currently active.`;
  s.active    = false;
  activeTools = buildActiveTools();
  toClient({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
  return `Deactivated "${alias}" — tools removed from context.`;
}

function status() {
  const lines = Object.entries(servers).map(([alias, s]) => {
    if (s.error)  return `${alias}: ❌ error — ${s.error}`;
    if (!s.ready) return `${alias}: ⏳ warming up`;
    if (s.active) return `${alias}: ✅ active (${s.tools.length} tools in context)`;
    return              `${alias}: ⏸  ready (${s.tools.length} tools available, not injected)`;
  });
  return lines.length ? lines.join('\n') : 'No servers configured.';
}

// ─── Handle requests from Claude Code ────────────────────────────────────────

const serverRl = readline.createInterface({ input: process.stdin });

serverRl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (_) { return; }
  if (msg.id === undefined) return; // notification — ignore

  // initialize
  if (msg.method === 'initialize') {
    return toClient({
      jsonrpc: '2.0', id: msg.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: 'mcpflip', version: '1.0' },
      },
    });
  }

  // tools/list
  if (msg.method === 'tools/list') {
    return toClient({ jsonrpc: '2.0', id: msg.id, result: { tools: activeTools } });
  }

  // tools/call
  if (msg.method === 'tools/call') {
    const { name, arguments: args = {} } = msg.params;
    const reply = (text) =>
      toClient({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text }] } });

    if (name === 'mcpflip_activate')   return reply(activate(args.name));
    if (name === 'mcpflip_deactivate') return reply(deactivate(args.name));
    if (name === 'mcpflip_status')     return reply(status());

    // Proxy to whichever active server owns this tool
    const alias = Object.keys(servers).find(a =>
      servers[a].active && servers[a].tools.some(t => t.name === name)
    );

    if (alias) {
      try {
        const result = await serverRequest(alias, 'tools/call', { name, arguments: args });
        return toClient({ jsonrpc: '2.0', id: msg.id, result });
      } catch (e) {
        return toClient({
          jsonrpc: '2.0', id: msg.id,
          result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true },
        });
      }
    }

    return toClient({
      jsonrpc: '2.0', id: msg.id,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    });
  }

  // ping
  if (msg.method === 'ping') {
    return toClient({ jsonrpc: '2.0', id: msg.id, result: {} });
  }

  toClient({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } });
});

// ─── Startup: pre-warm all servers in parallel ────────────────────────────────

Promise.allSettled(
  Object.keys(CONFIG).map(alias =>
    prewarmServer(alias).catch(e => {
      servers[alias] = { ready: false, active: false, tools: [], error: e.message };
    })
  )
);

process.on('SIGTERM', () => { Object.values(servers).forEach(s => s.process?.kill()); process.exit(0); });
process.on('SIGINT',  () => { Object.values(servers).forEach(s => s.process?.kill()); process.exit(0); });
