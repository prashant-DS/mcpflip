# Laptop-Setup

Things to setUp in new work laptop

## Setup Flow

1. [Applications](#1-applications)
2. [Terminal Setup](#2-terminal-setup)
3. [GitHub CLI Setup](#3-github-cli-setup)
4. [VS Code Setup](#4-vs-code-setup)
5. [Browser Setup](#5-browser-setup)
6. [macOS Preferences](#6-macos-preferences)
7. [Claude Code Setup](#7-claude-code-setup)

---

## 1. Applications

### Download

| App | Purpose |
|------|---------|
| [Handy](https://handy.computer/download) | Local voice to text |
| [ChatGPT](https://chatgpt.com/download) | AI assistant |
| [Brave Browser](https://brave.com/download/) | Web browser |
| [Visual Studio Code](https://code.visualstudio.com/download) | Code editor |

### Install via Homebrew

#### Install Homebrew (if not already installed)

```sh
brew --version || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Apps Included

| Tool | Purpose |
|------|---------|
| iTerm2 | Modern terminal emulator |
| Maccy | Clipboard history manager |
| IINA | Modern video player |
| Postman | API development and testing |

#### Install All

```sh
brew install --cask iterm2 maccy iina postman
```

---

## 2. Terminal Setup

### Install Oh My Zsh

```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### Install Shell Tools

```sh
brew install fzf zoxide
```

```sh
git clone https://github.com/zsh-users/zsh-autosuggestions \
${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

git clone https://github.com/zsh-users/zsh-syntax-highlighting \
${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

```sh
$(brew --prefix)/opt/fzf/install
```

> Answer **y** to all prompts.

### Update `~/.zshrc`

#### Replace the plugins section with

```sh
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
)
```

#### Append Custom Configuration

```sh
cat <<'EOF' >> ~/.zshrc

# =========================
# My Custom Configuration
# =========================

autoload -U colors && colors
PS1='%S%F{green}%n:%F{cyan}%~%F{yellow}%#%f%s'

alias dc="git commit --allow-empty -m 'test: dummy commit' && git push"
alias nst="npm start"
alias ns="npm run serve"
alias nt="npm run test"
alias gpm='git pull origin "$(git symbolic-ref --short refs/remotes/origin/HEAD | cut -d/ -f2)"'
alias gp="git push origin HEAD"

eval "$(zoxide init zsh)"

# =============================
# End of My Custom Configuration
# =============================

EOF

source ~/.zshrc && open ~/.zshrc
```

### Configure Option Key for Word Navigation

Configure the Option key so shortcuts such as **⌥ + Delete** delete the previous word.

1. Open **iTerm2**.
2. Press **⌘ + ,** to open Settings.
3. Go to **Profiles → Keys**.
4. Set:

   | Setting | Value |
   |---------|-------|
   | Left Option Key | `Esc+` |
   | Right Option Key | `Esc+` |

### Disable Quit Confirmation

1. Open **iTerm2**.
2. Press **⌘ + ,** to open Settings.
3. Go to **General → Closing**.
4. Uncheck **Confirm Quit iTerm2**.

---

## 3. GitHub CLI Setup

### Install GitHub CLI

```sh
brew install gh
```

### Authenticate

```sh
gh auth login
```

### Enable Shell Completion

Append the following line to the existing custom configuration in `~/.zshrc`:

```sh
eval "$(gh completion -s zsh)"
```

Reload the shell:

```sh
source ~/.zshrc
```

### Verify Authentication

```sh
gh auth status
```

---

## 4. VS Code Setup

### Sync Settings

1. Open **Visual Studio Code**.
2. Click the **Settings Sync** icon in the bottom-left corner, or go to **Settings → Turn on Settings Sync**.
3. Sign in with your **personal GitHub account**.
4. Sync everything: Settings, Extensions, Keyboard Shortcuts, Snippets, UI State, and more.

### Enable `code` Command in Terminal

1. Open **Visual Studio Code**.
2. Press **⌘ + ⇧ + P**.
3. Run:

   ```text
   Shell Command: Install 'code' command in PATH
   ```

---

## 5. Browser Setup

### Install Extensions (Work Profile)

| Extension | Purpose |
|-----------|---------|
| [Bookmark Search](https://chromewebstore.google.com/detail/bookmark-search/hhmokalkpaiacdofbcddkogifepbaijk?hl=en-US&utm_source=ext_sidebar) | Quickly search browser bookmarks |
| [ColorZilla](https://chromewebstore.google.com/detail/colorzilla/bhlhnicpbhignbdhedgjhgdocnmhomnp?hl=en-US&utm_source=ext_sidebar) | Color picker and CSS inspection |
| [Dark Reader](https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh) | Dark mode for websites |
| [GoFullPage](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl) | Capture full-page screenshots |
| [Mokku](https://chromewebstore.google.com/detail/mokku/llflfcikklhgamfmnjkgpdadpmdplmji) | Mocking network requests |
| [OCR Image Reader](https://chromewebstore.google.com/detail/ocr-image-reader/bhbhjjkcoghibhibegcmbomkbakkpdbo) | Extract text from images |
| [Open Jira Ticket](https://chromewebstore.google.com/detail/open-jira-ticket/blblhnpjhhjdbgbcgmmldohpalmbedci?hl=en-US&utm_source=ext_sidebar) | Open Jira tickets directly from ticket IDs |
| [Page Ruler](https://chromewebstore.google.com/detail/page-ruler/jcbmcnpepaddcedmjdcmhbekjhbfnlff) | Measure distances and element sizes on web pages |
| [React Developer Tools](https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) | Inspect React component tree |
| [Redux DevTools](https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) | Inspect Redux state and actions |

---

## 6. macOS Preferences

### Copy Screenshots to Clipboard by Default

1. Press **⌘ + ⇧ + 5**.
2. Click **Options**.
3. Under **Save to**, select **Clipboard**.

---

## 7. Claude Code Setup

### Configure Status Line

Copy the following prompt and give it to Claude Code:

```text
Set up a Claude Code status line. Do not ask any questions; apply everything directly.

Create the directory if it does not exist, then create `~/.claude/statusline-command.sh` with the following exact content:

#!/bin/bash
# Format: ● {repo}  ⎇ {branch}  │  ▓░░░░░░░░░  14%  │  $0.05
# Plain monochrome text, no ANSI colors.

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')

# Repo name: use git root name if in a repo, else current dir name
toplevel=$(git -C "$cwd" --no-optional-locks rev-parse --show-toplevel 2>/dev/null)
if [ -n "$toplevel" ]; then
  repo_name=$(basename "$toplevel")
else
  repo_name=$(basename "$cwd")
fi

# Branch name
branch=""
if [ -n "$cwd" ]; then
  branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
fi
[ -z "$branch" ] && branch="no-branch"

# Context window: 10-block progress bar + percentage
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
pct_int=$(printf "%.0f" "$used_pct")
filled=$(( (pct_int + 5) / 10 ))
[ "$filled" -gt 10 ] && filled=10
[ "$filled" -lt 0 ] && filled=0
empty=$((10 - filled))

bar=""
for ((i = 0; i < filled; i++)); do bar="${bar}▓"; done
for ((i = 0; i < empty; i++)); do bar="${bar}░"; done

# Session cost
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
cost_str=$(printf "\$%.2f" "$cost")

printf "● %s  ⎇ %s  │  %s  %s%%  │  %s" "$repo_name" "$branch" "$bar" "$pct_int" "$cost_str"

Then create `~/.claude/settings.json` if it does not exist. Otherwise, preserve all of its existing settings and add or replace this top-level `statusLine` object:

"statusLine": {
  "type": "command",
  "command": "bash ~/.claude/statusline-command.sh"
}

Ensure that `~/.claude/settings.json` remains valid JSON. Do not modify anything else.
```

### Install MCPFlip

```sh
curl -fsSL https://raw.githubusercontent.com/prashant-DS/mcpflip/main/install-remote.sh | bash
```

### Configure Terminal Focus Hooks

Copy the following prompt and give it to Claude Code:

```text
Add two hooks to `~/.claude/settings.json` as global user settings, not project settings. Do not ask any questions; apply everything directly.

Read the existing file first. Preserve all existing top-level keys, including any existing `statusLine` configuration. Add or replace the top-level `hooks` object with the following valid JSON:

{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "for app in \"iTerm2\" \"iTerm\" \"Terminal\" \"Warp\" \"Ghostty\" \"Alacritty\" \"kitty\"; do if pgrep -ix \"$app\" > /dev/null 2>&1; then osascript -e \"tell application \\\"$app\\\" to activate\" 2>/dev/null && break; fi; done",
            "async": true
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "for app in \"iTerm2\" \"iTerm\" \"Terminal\" \"Warp\" \"Ghostty\" \"Alacritty\" \"kitty\"; do if pgrep -ix \"$app\" > /dev/null 2>&1; then osascript -e \"tell application \\\"$app\\\" to activate\" 2>/dev/null && break; fi; done",
            "async": true
          }
        ]
      }
    ]
  }
}

After writing, validate the configuration with:

jq -e '.hooks.Stop[0].hooks[0].command, .hooks.Notification[0].hooks[0].command' ~/.claude/settings.json

Do not modify anything else.
```
