#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/.claude/mcpflip"
SKILL_DIR="$HOME/.claude/skills/mcpflip"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing mcpflip..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$SKILL_DIR"

# Copy files
cp "$SCRIPT_DIR/gateway.js" "$INSTALL_DIR/gateway.js"
cp "$SCRIPT_DIR/SKILL.md"   "$INSTALL_DIR/SKILL.md"

# Copy servers.json only if it doesn't exist (don't overwrite user config)
if [ ! -f "$INSTALL_DIR/servers.json" ]; then
  cp "$SCRIPT_DIR/servers.json" "$INSTALL_DIR/servers.json"
  echo "  Created servers.json"
else
  echo "  Skipped servers.json (already exists — keeping your config)"
fi

# Symlink SKILL.md into skills directory
SKILL_LINK="$SKILL_DIR/SKILL.md"
ln -sf "$INSTALL_DIR/SKILL.md" "$SKILL_LINK"

# Register MCP server (remove existing first to avoid duplicates)
claude mcp remove mcpflip -s user 2>/dev/null || true
claude mcp add -s user mcpflip -- node "$INSTALL_DIR/gateway.js"

echo ""
echo "mcpflip installed successfully."
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code"
echo "  2. Run /mcpflip setup  — to migrate your existing Claude Code MCPs"
echo "  3. Restart Claude Code again"
echo "  4. Run /mcpflip help to get started"
