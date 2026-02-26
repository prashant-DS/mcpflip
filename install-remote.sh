#!/usr/bin/env bash
set -e

# Set this to your repo's raw base URL after publishing
REPO="https://raw.githubusercontent.com/YOUR_USERNAME/mcpflip/main"

INSTALL_DIR="$HOME/.claude/mcpflip"
SKILL_DIR="$HOME/.claude/skills/mcpflip"

echo "Installing mcpflip..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$SKILL_DIR"

# Download files
curl -fsSL "$REPO/gateway.js" -o "$INSTALL_DIR/gateway.js"
curl -fsSL "$REPO/SKILL.md"   -o "$INSTALL_DIR/SKILL.md"

# Download servers.json only if it doesn't exist (don't overwrite user config)
if [ ! -f "$INSTALL_DIR/servers.json" ]; then
  curl -fsSL "$REPO/servers.json" -o "$INSTALL_DIR/servers.json"
  echo "  Created servers.json"
else
  echo "  Skipped servers.json (already exists — keeping your config)"
fi

# Symlink SKILL.md into skills directory
SKILL_LINK="$SKILL_DIR/SKILL.md"
if [ -L "$SKILL_LINK" ]; then
  rm "$SKILL_LINK"
fi
ln -s "$INSTALL_DIR/SKILL.md" "$SKILL_LINK"

# Register MCP server (remove existing first to avoid duplicates)
claude mcp remove mcp-gateway -s user 2>/dev/null || true
claude mcp add -s user mcp-gateway -- node "$INSTALL_DIR/gateway.js"

echo ""
echo "mcpflip installed successfully."
echo ""
echo "Next steps:"
echo "  1. Edit ~/.claude/mcpflip/servers.json to add your MCP servers"
echo "  2. Restart Claude Code"
echo "  3. Run /mcpflip help to get started"
