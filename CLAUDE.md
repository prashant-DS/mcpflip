# mcpflip — Agent Instructions

## Release Checklist

**Every push to `main` MUST follow these steps in order:**

1. **Update `CHANGELOG.md`** — add a new entry at the top with date and what changed
   - **User-facing changes only** — new commands, changed behaviour, UX improvements
   - Never include internal fixes (bug fixes in gateway internals, refactors, renamed variables, etc.)
2. **Commit** — changes + changelog in a single commit
3. **Push** to main

Never push to main without completing all three steps.

---

## Project Overview

mcpflip is a Claude Code MCP gateway. It:
- Pre-warms all configured MCP servers at startup
- Exposes only 3 tools by default: `mcpflip_activate`, `mcpflip_deactivate`, `mcpflip_status`
- Injects a server's tools into context only when the user explicitly runs `/mcpflip activate <name>`
- Removes tools on deactivate — server stays warm for instant re-activation

## Key Files

| File | Purpose |
|---|---|
| `gateway.js` | The MCP gateway process — runs as a Node.js child of Claude Code |
| `SKILL.md` | Claude Code skill — handles all `/mcpflip` slash commands |
| `servers.json` | Ships empty `{}` — user configures via `/mcpflip setup` or `/mcpflip add` |
| `install.sh` | Install from local clone |
| `install-remote.sh` | Install via curl (no clone needed) |
| `CHANGELOG.md` | Version history — always update before pushing |

## Install Paths (on user's machine)

- `~/.claude/mcpflip/gateway.js` — the running gateway
- `~/.claude/mcpflip/SKILL.md` — skill source
- `~/.claude/mcpflip/servers.json` — user's server config (never overwrite)
- `~/.claude/skills/mcpflip/SKILL.md` — symlink to the above

## Design Rules

- **Never hardcode server names** anywhere (no `chrome`, `github`, `linear`, etc.) — mcpflip is a generic wrapper
- **Never ship default servers** in `servers.json` — it ships as `{}`
- **`disable-model-invocation: true`** must always be present in SKILL.md frontmatter
- **Tool names** are prefixed `mcpflip_` — never `gateway_` or anything else
- **Confirmations** use `AskUserQuestion` with structured options; fall back to plain text if unavailable
