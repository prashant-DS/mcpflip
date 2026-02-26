# mcpflip

MCP Gateway for Claude Code — pre-warms all configured MCP servers at startup but injects their tools into context only when you explicitly activate them.

**Zero context pollution by default. Full native tool access on demand.**

## The problem

Every MCP server registered with Claude Code injects its full tool list into context at session startup. With many servers, this burns thousands of tokens before you type a single character — and those tools sit in context for every message even if you never use them.

## How it works

- Gateway starts at session init and pre-warms all configured MCP servers (handshake + tool fetch)
- Tools are **not** injected into Claude's context yet — only 3 gateway tools visible
- You activate a server when you need it → tools appear natively via `notifications/tools/list_changed`
- Deactivate when done → context is clean again, server stays warm for instant re-activation

```
session start     → 3 gateway tools in context, all servers pre-warmed silently
/mcpflip activate chrome   → 26 native chrome tools injected instantly
/mcpflip deactivate chrome → tools removed, context clean
```

## Install

**Option 1 — curl (no clone needed):**

```bash
curl -fsSL https://raw.githubusercontent.com/prashant-DS/mcpflip/main/install-remote.sh | bash
```

**Option 2 — clone:**

```bash
git clone https://github.com/prashant-DS/mcpflip.git
cd mcpflip && ./install.sh
```

Then restart Claude Code.

## Configure your servers

Edit `~/.claude/mcpflip/servers.json`:

```json
{
  "chrome": {
    "command": "npx",
    "args": ["-y", "chrome-devtools-mcp@latest"]
  },
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"]
  }
}
```

Restart Claude Code after any changes to this file.

## Usage

| Command                                    | Description                       |
| ------------------------------------------ | --------------------------------- |
| `/mcpflip activate <name>`                 | Inject server tools into context  |
| `/mcpflip deactivate <name>`               | Remove server tools from context  |
| `/mcpflip status`                          | Show all servers and their state  |
| `/mcpflip add <alias> -- <command> [args]` | Add a new server                  |
| `/mcpflip setup`                           | Migrate existing Claude Code MCPs |
| `/mcpflip help`                            | Show command reference            |

## Files

| File                | Purpose                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway.js`        | MCP server — the gateway engine                                                                                                                             |
| `servers.json`      | Default server config (example only)                                                                                                                        |
| `SKILL.md`          | Claude Code skill for `/mcpflip` commands — uses `disable-model-invocation: true` so Claude never auto-triggers these commands without explicit user intent |
| `install.sh`        | Install from local clone                                                                                                                                    |
| `install-remote.sh` | Install via curl (no clone needed)                                                                                                                          |
| `ARCHITECTURE.md`   | Technical deep-dive with diagrams                                                                                                                           |

## Requirements

- Node.js v20+
- Claude Code with `claude` CLI available in PATH
