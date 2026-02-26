# mcpflip

MCP Gateway for Claude Code — pre-warms all configured MCP servers at startup but injects their tools into context only when you explicitly activate them.

**Zero context pollution by default. Full native tool access on demand.**

## The problem

Every MCP server registered with Claude Code injects its full tool list into context at session startup. With many servers, this burns thousands of tokens before you type a single character.

## How it works

- All configured servers start and warm up at session init (handshake + tool fetch)
- Tools are **not** injected into Claude's context yet
- You activate a server when you need it → tools appear natively via `notifications/tools/list_changed`
- Deactivate when done → context clean again

## Setup

**1. Copy files**
```bash
mkdir -p ~/.claude/mcpflip
cp gateway.js servers.json SKILL.md ~/.claude/mcpflip/

mkdir -p ~/.claude/skills/mcpflip
ln -s ~/.claude/mcpflip/SKILL.md ~/.claude/skills/mcpflip/SKILL.md
```

**2. Register the gateway**
```bash
claude mcp add -s user mcp-gateway -- node ~/.claude/mcpflip/gateway.js
```

**3. Configure your servers**

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

**4. Restart Claude Code**

## Usage

```
/mcpflip activate chrome      → inject 26 chrome tools into context
/mcpflip deactivate chrome    → remove tools, context clean
/mcpflip status               → see all servers and their state
/mcpflip add github -- npx -y @modelcontextprotocol/server-github
/mcpflip setup                → migrate existing Claude Code MCPs
/mcpflip help                 → show all commands
```

## Files

| File | Purpose |
|---|---|
| `gateway.js` | MCP server — the gateway engine |
| `servers.json` | Your MCP server config |
| `SKILL.md` | Claude Code skill for `/mcpflip` commands |

## Requirements

- Node.js v20+
- Claude Code
