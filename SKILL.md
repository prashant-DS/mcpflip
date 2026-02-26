---
name: "mcpflip"
description: "Toggle MCP servers on/off mid-session. Manage MCP gateway config. Usage: /mcpflip <command> [args]"
disable-model-invocation: true
---

# mcpflip — MCP Gateway Control

You are the mcpflip controller. Parse the user's input carefully and follow the exact steps for each command. When anything is ambiguous or missing, ask the user before proceeding. Never guess or assume.

## Command Routing

Parse the first word after `/mcpflip` as the subcommand:

| Subcommand | Action |
|---|---|
| `activate` | Inject server tools into context |
| `deactivate` | Remove server tools from context |
| `status` | Show all servers and their state |
| `add` | Add a new server to the gateway |
| `setup` | Migrate Claude Code MCPs into the gateway |
| `uninstall` | Remove mcpflip completely |
| `help` | Show command reference |
| *(nothing)* | Show help |
| *(unrecognized)* | Say "Unknown command. Run /mcpflip help to see available commands." |

---

## activate

**Purpose:** Inject a configured server's tools into context.

**Input:** `/mcpflip activate <name>`

**Steps:**

1. **Extract server name** from the argument after `activate`
   - If no name provided → ask: "Which server would you like to activate? Run `/mcpflip status` to see available servers."
   - Do not proceed until you have a name

2. **Call `gateway_status`** to get the current server list and states

3. **Match the name** (case-insensitive, partial match):
   - Exact match → use it
   - One partial match → use it, confirm: "Activating {resolved alias}..."
   - Multiple partial matches → use `AskUserQuestion`:
     - Question: "Multiple servers match '{name}'. Which did you mean?"
     - Options: one option per matching alias
   - No match → say: "No server found matching '{name}'. Available: [list from status]"

4. **Check server state:**
   - Already active → say: "'{alias}' is already active with X tools in context."
   - Not ready (still warming up) → say: "'{alias}' is still warming up. Try again in a moment."
   - Error state → say: "'{alias}' failed to start: {error}. Check your servers.json config."

5. **Call `gateway_activate`** with the resolved alias

6. **Report:** "Activated '{alias}' — X tools are now in context."

---

## deactivate

**Purpose:** Remove a server's tools from context. Server stays pre-warmed.

**Input:** `/mcpflip deactivate <name>`

**Steps:**

1. **Extract server name** from the argument after `deactivate`
   - If no name provided → call `gateway_status`, then ask: "Which active server would you like to deactivate?"
   - Do not proceed until you have a name

2. **Call `gateway_status`** to get active servers

3. **Match the name** against active servers only:
   - Match found → proceed
   - No match but server exists (just not active) → say: "'{name}' is not currently active."
   - No match at all → say: "No active server matching '{name}'. Run `/mcpflip status` to see what's active."

4. **Call `gateway_deactivate`** with resolved alias

5. **Report:** "Deactivated '{alias}' — tools removed from context. Server stays warm for instant re-activation."

---

## status

**Purpose:** Show all configured servers and their current state.

**Input:** `/mcpflip status`

**Steps:**

1. Call `gateway_status`
2. Display result clearly
3. If no servers configured → say: "No servers configured. Run `/mcpflip setup` to migrate existing MCPs or `/mcpflip add` to add one."

---

## add

**Purpose:** Add a new MCP server to the gateway config.

**Input:** `/mcpflip add <alias> -- <command> [args...]`

**Steps:**

1. **Parse the input:**
   - Everything before `--` = alias (trim whitespace)
   - Everything after `--` = command + args (first token = command, rest = args array)
   - If `--` is missing → say: "Missing `--` separator. Format: `/mcpflip add <alias> -- <command> [args]`" and stop
   - If alias is empty → ask: "What alias would you like to use for this server?"
   - If command is empty → ask: "What command should be used to start this server?"

2. **Validate alias:**
   - Only allow alphanumeric and hyphens
   - If invalid characters → say: "Alias can only contain letters, numbers, and hyphens."

3. **Read `~/.claude/mcpflip/servers.json`**

4. **Check for existing alias:**
   - If alias exists → use `AskUserQuestion`:
     - Question: "A server named '{alias}' already exists ({existing command}). Overwrite it?"
     - Options: `["Yes, overwrite", "No, keep existing"]`
   - If "No, keep existing" → stop
   - If "Yes, overwrite" → proceed

5. **Add the entry:**
   ```json
   "<alias>": { "command": "<command>", "args": ["<arg1>", "<arg2>"] }
   ```

6. **Write updated servers.json**

7. **Report:** "Added '{alias}'. Restart your Claude Code session for the gateway to pick it up."

---

## setup

**Purpose:** Migrate existing Claude Code MCP servers into the gateway config.

**Steps:**

1. **Read `~/.claude.json`** and extract all `mcpServers` entries across all scopes

2. **Read `~/.claude/mcpflip/servers.json`**

3. **Find MCPs not yet in servers.json** (compare by command+args, not just name)
   - **Always skip the `mcpflip` entry** — it's the gateway itself, not a server to migrate

4. **If none found** → say: "All your Claude Code MCPs are already in the gateway, or you have none configured."

5. **Show the context, then use `AskUserQuestion` with `multiSelect: true`:**
   - First display:
     ```
     Found X MCP servers in your Claude Code config.

     Migrating moves a server into mcpflip — tools only appear when you run /mcpflip activate <name>.
     Servers you don't migrate stay in Claude Code's native config (always in context).
     ```
   - Then call `AskUserQuestion`:
     - Question: "Which servers would you like to migrate to mcpflip?"
     - Options: `["All servers"]` + one option per server: `"<alias>  (<command> <args>)"`
     - multiSelect: true
   - Populate options from actual entries read in step 1 — never hardcode names

6. **Parse the selection:**
   - "All servers" selected (alone or with others) → migrate every server in the list
   - Specific servers selected → migrate only those
   - Nothing selected → say "No changes made." and stop

7. **For each selected server:**
   - Add to servers.json with its alias and command
   - Run `claude mcp remove <name> -s user` to remove from Claude Code native config
   - If remove fails → warn user but continue: "Could not remove '{name}' from Claude Code config — you may need to remove it manually to avoid duplication."

8. **Write updated servers.json**

9. **Report:** "Migrated X servers. Restart your Claude Code session to apply changes."

---

## uninstall

**Purpose:** Remove mcpflip completely from the system.

**Input:** `/mcpflip uninstall`

**Steps:**

1. **Read `~/.claude/mcpflip/servers.json`**
   - If it has entries, display the list:
     ```
     Found X servers in your mcpflip config:
       - <alias>  (<command> <args>)
       ...
     ```
   - Then use `AskUserQuestion`:
     - Question: "Migrate these servers back to Claude Code's native config before uninstalling? (If no, they will be permanently deleted.)"
     - Options: `["Yes, migrate back", "No, delete them"]`
   - If "Yes, migrate back" → for each entry run: `claude mcp add -s user <alias> -- <command> [args...]`
     - If any add fails → warn: "Could not restore '{alias}' — you may need to add it manually."
   - If "No, delete them" → proceed without migrating
   - If servers.json is empty → skip this step

2. **Show what will be removed, then use `AskUserQuestion`:**
   - Display:
     ```
     This will permanently remove:
       - mcpflip from Claude Code's MCP registry
       - ~/.claude/mcpflip/  (gateway.js, SKILL.md, servers.json)
       - ~/.claude/skills/mcpflip/  (skill symlink)
     ```
   - Then call `AskUserQuestion`:
     - Question: "Permanently remove mcpflip and all its files?"
     - Options: `["Yes, uninstall", "No, cancel"]`
   - If "No, cancel" → say "Uninstall cancelled." and stop

3. **Run the following in order:**
   - `claude mcp remove mcpflip -s user`
   - `rm -rf ~/.claude/mcpflip`
   - `rm -rf ~/.claude/skills/mcpflip`

4. **Report:** "mcpflip uninstalled. Restart Claude Code to complete removal."

---

## help

**Purpose:** Show available commands and examples.

Display the following:

```
mcpflip — MCP Gateway Control

Commands:
  /mcpflip activate <name>                      Inject server tools into context
  /mcpflip deactivate <name>                    Remove server tools from context
  /mcpflip status                               Show all servers and their state
  /mcpflip add <alias> -- <command> [args]      Add a new server to the gateway
  /mcpflip setup                                Migrate Claude Code MCPs into gateway
  /mcpflip uninstall                            Remove mcpflip completely
  /mcpflip help                                 Show this reference

Examples:
  /mcpflip activate <name>
  /mcpflip deactivate <name>
  /mcpflip add <alias> -- <command> [args]
  /mcpflip setup

servers.json: ~/.claude/mcpflip/servers.json
```

---

## General rules

- **Never proceed when input is ambiguous** — always ask first
- **Never edit files without confirming** with the user when destructive (overwrite, remove)
- **Never remove from Claude Code config** without explicit user confirmation
- **Always show gateway_status output** when a server name can't be matched
- **Keep responses concise** — one confirmation line is enough for success cases
- **AskUserQuestion fallback** — if `AskUserQuestion` is unavailable, ask the question as plain text and wait for the user's typed response before proceeding
