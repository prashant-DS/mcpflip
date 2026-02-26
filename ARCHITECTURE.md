# mcpflip — Technical Architecture

## The Core Idea

Claude Code loads **every** registered MCP server's tools into context at session startup. 10 servers × 20 tools = 200 tool definitions sitting in every prompt, costing tokens and diluting attention — even if you never use them.

mcpflip sits between Claude Code and all your MCP servers as a **multiplexing gateway**. It pre-warms servers silently and exposes only 3 tiny control tools until you explicitly activate a server.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Claude Code                                 │
│                                                                      │
│  Sees only:                                                          │
│    gateway_activate, gateway_deactivate, gateway_status              │
│    + tools from any ACTIVE servers                                   │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  stdio (JSON-RPC over stdin/stdout)
                       │
┌──────────────────────▼───────────────────────────────────────────────┐
│                       gateway.js (Node.js)                           │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │ MCP Server  │  │ Tool Router  │  │ Active Tools Registry     │   │
│  │ (to Claude) │  │              │  │                           │   │
│  │             │  │ gateway_*  ──┼──▶ handle locally            │   │
│  │ initialize  │  │              │  │                           │   │
│  │ tools/list  │  │ other tool ──┼──▶ find owning server ──┐   │   │
│  │ tools/call  │  │              │  │                      │   │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┼───┘   │
│                                                             │       │
│  ┌──────────────────────────────────────────────────────────▼───┐   │
│  │                    Server Manager                            │   │
│  │                                                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ chrome  │  │ github  │  │ linear  │  │  ...    │       │   │
│  │  │         │  │         │  │         │  │         │       │   │
│  │  │ state:  │  │ state:  │  │ state:  │  │ state:  │       │   │
│  │  │ ready   │  │ active  │  │ error   │  │ warming │       │   │
│  │  │ 26 tools│  │ 15 tools│  │ 0 tools │  │ 0 tools │       │   │
│  │  └────┬────┘  └────┬────┘  └─────────┘  └─────────┘       │   │
│  │       │            │                                        │   │
│  └───────┼────────────┼────────────────────────────────────────┘   │
└──────────┼────────────┼────────────────────────────────────────────┘
           │            │
     stdio │      stdio │     (each server is a child process)
           │            │
     ┌─────▼─────┐ ┌────▼──────┐
     │ chrome    │ │ github    │
     │ MCP       │ │ MCP       │
     │ server    │ │ server    │
     └───────────┘ └───────────┘
```

**Key point:** Claude Code thinks it's talking to one MCP server. The gateway fans out to many.

---

## Server Lifecycle

Each server in `servers.json` goes through these states:

```
                  ┌───────────────┐
                  │   spawned     │
                  │  (process     │
                  │   started)    │
                  └───────┬───────┘
                          │
                   initialize +
                 tools/list handshake
                          │
              ┌───────────┼───────────┐
              │ success   │           │ failure/timeout
              ▼           │           ▼
      ┌───────────┐       │   ┌───────────┐
      │   ready   │       │   │   error   │
      │           │       │   │           │
      │ tools     │       │   │ message   │
      │ cached,   │       │   │ stored    │
      │ not in    │       │   └───────────┘
      │ context   │       │
      └─────┬─────┘       │
            │              │
    activate │              │
            ▼              │
      ┌───────────┐
      │  active   │
      │           │
      │ tools in  │ process exits
      │ Claude's  │ unexpectedly
      │ context   │──────────────▶ ┌───────────┐
      └─────┬─────┘                │   error   │
            │                      │           │
  deactivate│                      │ message   │
            ▼                      │ stored    │
      ┌───────────┐                └───────────┘
      │   ready   │
      │ (instant  │
      │ re-activate)
      └───────────┘
```

**States:**

| State   | `ready` | `active` | `error`  | Meaning                              |
| ------- | ------- | -------- | -------- | ------------------------------------ |
| warming | `false` | `false`  | –        | Handshake in progress                |
| ready   | `true`  | `false`  | –        | Tools cached, not in context         |
| active  | `true`  | `true`   | –        | Tools injected into Claude's context |
| error   | `false` | `false`  | `string` | Spawn/handshake/crash failed         |

---

## Message Flow

### Startup — Pre-warming

```
gateway.js                     chrome MCP server
    │                                │
    │──── spawn process ────────────▶│
    │                                │
    │──── initialize ───────────────▶│
    │◀─── initialize result ────────│
    │                                │
    │──── notifications/initialized ▶│
    │                                │
    │──── tools/list ───────────────▶│
    │◀─── { tools: [...26 tools] } ──│
    │                                │
    │  (cache tools, mark ready)     │
    │  (repeat for all servers       │
    │   in parallel)                 │
```

All servers pre-warm concurrently via `Promise.allSettled`. Failures are caught per-server — one broken server doesn't block the rest.

### Activate — Injecting Tools

```
Claude Code              gateway.js
    │                        │
    │── tools/call ─────────▶│  { name: "gateway_activate", arguments: { name: "chrome" } }
    │                        │
    │                        │  1. Set chrome.active = true
    │                        │  2. Rebuild activeTools = GATEWAY_TOOLS + chrome.tools
    │                        │  3. Send notification ─────────▶ (back to Claude Code)
    │◀── notification ───────│  { method: "notifications/tools/list_changed" }
    │                        │
    │── tools/list ─────────▶│  (Claude Code re-fetches tool list)
    │◀── result ─────────────│  { tools: [3 gateway + 26 chrome tools] }
    │                        │
    │  Claude now sees 29 tools
```

The `notifications/tools/list_changed` notification triggers Claude Code to re-call `tools/list`, which now includes the activated server's tools.

### Tool Proxy — Calling an Activated Server's Tool

```
Claude Code              gateway.js                 chrome MCP server
    │                        │                             │
    │── tools/call ─────────▶│                             │
    │   { name: "chrome_    ││                             │
    │     navigate" }        ││  1. Not a gateway_* tool   │
    │                        ││  2. Find: chrome.tools     │
    │                        ││     has "chrome_navigate"   │
    │                        ││                             │
    │                        │── tools/call ──────────────▶│
    │                        │   { name: "chrome_navigate" }│
    │                        │◀── result ─────────────────│
    │                        │                             │
    │◀── result ─────────────│  (forwarded unchanged)
```

The gateway acts as a transparent proxy. Claude Code never knows it's talking to a child process.

### Deactivate — Removing Tools

```
Claude Code              gateway.js
    │                        │
    │── tools/call ─────────▶│  { name: "gateway_deactivate", arguments: { name: "chrome" } }
    │                        │
    │                        │  1. Set chrome.active = false
    │                        │  2. Rebuild activeTools = GATEWAY_TOOLS only
    │                        │  3. Send notifications/tools/list_changed
    │◀── notification ───────│
    │                        │
    │── tools/list ─────────▶│
    │◀── result ─────────────│  { tools: [3 gateway tools] }
    │                        │
    │  Chrome process still alive (instant re-activate later)
```

---

## JSON-RPC Protocol

All communication uses [JSON-RPC 2.0](https://www.jsonrpc.org/specification) over newline-delimited JSON on stdio.

### Gateway → Claude Code (as MCP server)

The gateway responds to these methods from Claude Code:

| Method        | Response                                          |
| ------------- | ------------------------------------------------- |
| `initialize`  | Capabilities: `{ tools: { listChanged: true } }`  |
| `tools/list`  | Current `activeTools` array                       |
| `tools/call`  | Route to gateway handler or proxy to child server |
| `ping`        | Empty `{}` result                                 |
| anything else | Error `-32601 Method not found`                   |

### Gateway → Child Servers (as MCP client)

The gateway sends these to each child server:

| Method                      | When                                       |
| --------------------------- | ------------------------------------------ |
| `initialize`                | During pre-warm handshake                  |
| `notifications/initialized` | After successful init                      |
| `tools/list`                | Once, to cache available tools             |
| `tools/call`                | When proxying a tool call from Claude Code |

---

## Data Structures

### servers.json (config)

```json
{
  "<alias>": {
    "command": "<executable>",
    "args": ["<arg1>", "<arg2>"]
  }
}
```

### Internal State: `servers[alias]`

```javascript
{
  process: ChildProcess,   // spawned child process handle
  tools:   Tool[],         // cached MCP tool definitions from tools/list
  nextId:  number,         // auto-incrementing JSON-RPC request ID
  pending: {               // in-flight requests awaiting response
    [id]: { resolve, reject }
  },
  ready:   boolean,        // true after successful handshake + tools/list
  active:  boolean,        // true = tools are in Claude's context
  error:   string | undefined  // set on crash or handshake failure
}
```

### `activeTools` (what Claude Code sees)

```
activeTools = GATEWAY_TOOLS                              // always present (3 tools)
            + servers where (active && tools.length > 0) // conditionally merged
```

Rebuilt by `buildActiveTools()` on every activate/deactivate/exit event.

---

## File Layout

```
~/.claude/
├── mcpflip/
│   ├── gateway.js          ← the MCP gateway process
│   ├── servers.json        ← user's server configuration
│   └── SKILL.md            ← skill source (canonical copy)
└── skills/
    └── mcpflip/
        └── SKILL.md        ← symlink → ~/.claude/mcpflip/SKILL.md
```

### Why a symlink?

Claude Code auto-discovers skills from `~/.claude/skills/*/SKILL.md`. But the canonical `SKILL.md` lives with the gateway code in `~/.claude/mcpflip/`. The symlink bridges both requirements — updates to the source propagate automatically.

---

## Installation Flow

```
install.sh / install-remote.sh
    │
    ├── mkdir -p ~/.claude/mcpflip/
    ├── mkdir -p ~/.claude/skills/mcpflip/
    │
    ├── copy (or curl) gateway.js → ~/.claude/mcpflip/
    ├── copy (or curl) SKILL.md   → ~/.claude/mcpflip/
    ├── copy servers.json → ~/.claude/mcpflip/  (only if not exists)
    │
    ├── ln -sf  ~/.claude/mcpflip/SKILL.md → ~/.claude/skills/mcpflip/SKILL.md
    │
    ├── claude mcp remove mcpflip -s user   (ignore errors)
    └── claude mcp add -s user mcpflip -- node ~/.claude/mcpflip/gateway.js
```

The `-sf` flag on `ln` handles both existing symlinks and regular files at the target path.

---

## SKILL.md — How `/mcpflip` Commands Work

The SKILL.md file is a Claude Code skill — a structured prompt that teaches Claude how to handle `/mcpflip` slash commands. It does **not** contain executable code. Instead, it instructs the LLM to:

1. Parse the subcommand from user input
2. Call the appropriate `gateway_*` tool
3. Handle edge cases (missing args, ambiguous matches, errors)
4. Format responses consistently

```
User types:           /mcpflip activate chrome
                           │
Claude Code reads:    SKILL.md (the skill prompt)
                           │
Claude decides:       Call gateway_activate({ name: "chrome" })
                           │
gateway.js handles:   activate("chrome") → sets active, sends list_changed
                           │
Claude Code:          Re-fetches tools/list → sees chrome tools
```

The skill adds **intelligence on top of the gateway** — partial matching, status checks before activating, user confirmations for destructive actions — while the gateway itself stays a simple, deterministic JSON-RPC router.

---

## Process Tree

```
Claude Code (parent)
  └── node gateway.js          ← single registered MCP server
        ├── npx chrome-devtools-mcp    ← child: pre-warmed
        ├── npx @mcp/server-github     ← child: pre-warmed
        └── npx linear-mcp            ← child: pre-warmed
```

On `SIGTERM` / `SIGINT`, the gateway kills all children before exiting. If a child crashes on its own, its state moves to `error` and `notifications/tools/list_changed` is sent so Claude Code drops its tools from context.

---

## Token Budget Comparison

| Setup                             | Tools in context at startup | Per-message overhead       |
| --------------------------------- | --------------------------- | -------------------------- |
| 5 MCP servers registered natively | ~100 tool defs              | ~100 tool defs (always)    |
| Same 5 through mcpflip            | 3 tool defs                 | 3 + only what you activate |
| mcpflip, 1 server activated       | 3 + ~20 tool defs           | ~23 tool defs              |

The savings compound with every message in the conversation.
