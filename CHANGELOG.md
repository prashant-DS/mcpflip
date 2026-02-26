# Changelog

## 2025-02-26

### Added
- `/mcpflip update` — update to latest version from inside Claude Code
- `/mcpflip uninstall` — cleanly remove mcpflip with option to migrate servers back to Claude Code
- Changelog shown automatically after running `/mcpflip update`

### Changed
- All confirmations now show Yes/No buttons instead of requiring typed responses
- `/mcpflip setup` now shows a checkbox list to pick which servers to migrate
- `servers.json` ships empty — no servers pre-configured on install

---

## 2025-02-26 — Initial release

- MCP gateway that pre-warms all configured servers at startup with only 3 tools in context
- `/mcpflip activate` — inject a server's tools into context on demand
- `/mcpflip deactivate` — remove tools, server stays warm for instant re-activation
- `/mcpflip status` — show all servers and their state
- `/mcpflip add` — add a new server to the gateway config
- `/mcpflip setup` — migrate existing Claude Code MCPs into the gateway
- Install via curl or local clone
