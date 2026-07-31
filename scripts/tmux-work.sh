#!/usr/bin/env bash
# tmux-work — 2x2 tmux grid of Claude Code chats.
# Adapted from the "4 Claude agents in a tmux grid" pattern:
#   https://medium.com/coding-nexus/i-replaced-my-entire-desktop-with-4-claude-agents-in-a-tmux-grid-heres-how-5dae914d2357
#
# Usage:
#   ./scripts/tmux-work.sh
#
# Env overrides:
#   TMUX_WORK_SESSION  session name (default: work)
#   TMUX_WORK_DIR      project directory (default: ~/dev/tong-tong)
#   CLAUDE_CMD         command to run in each pane (default: claude).
#                      e.g. CLAUDE_CMD="claude --dangerously-skip-permissions"
#
# Notes:
#   - Works regardless of tmux base-index (your ~/.tmux.conf uses index 1):
#     splits are driven by focus direction, panes are discovered dynamically.
set -euo pipefail

SESSION="${TMUX_WORK_SESSION:-work}"

command -v tmux >/dev/null 2>&1 || {
  echo "tmux is not installed. Install with: sudo apt install tmux" >&2
  exit 1
}

# Load nvm so `claude` resolves on PATH (nvm is not loaded in non-login shells).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true

PROJECT_DIR="${TMUX_WORK_DIR:-$HOME/dev/tong-tong}"
cd "$PROJECT_DIR" 2>/dev/null || {
  echo "Project directory not found: $PROJECT_DIR" >&2
  exit 1
}

# Reset only this session, leaving any other tmux sessions untouched.
tmux kill-session -t "$SESSION" 2>/dev/null || true

tmux new-session -d -s "$SESSION"

# Build the 2x2 grid. Splits act on the focused pane, so no hardcoded indices:
#   1. split top row horizontally         -> top-left | top-right (top-right focused)
#   2. split right pane vertically        -> adds bottom-right (focused)
#   3. focus up (top-right), left (top-left)
#   4. split top-left vertically          -> adds bottom-left
tmux split-window -h -t "$SESSION"
tmux split-window -v
tmux select-pane -U
tmux select-pane -L
tmux split-window -v

# Even out the four panes.
tmux select-layout -t "$SESSION" tiled 2>/dev/null || true

CLAUDE_CMD="${CLAUDE_CMD:-claude}"

# Target panes as session:window.pane (pane indices alone are ambiguous
# when the session has windows numbered from 1).
WIN="$(tmux list-windows -t "$SESSION" -F '#{window_index}' | head -1)"
for pane in $(tmux list-panes -t "$SESSION" -F '#{pane_index}' | sort -n); do
  tmux send-keys -t "$SESSION:$WIN.$pane" "cd $PROJECT_DIR" Enter
  tmux send-keys -t "$SESSION:$WIN.$pane" "$CLAUDE_CMD" Enter
done

FIRST_PANE="$(tmux list-panes -t "$SESSION" -F '#{pane_index}' | sort -n | head -1)"
tmux select-pane -t "$SESSION:$WIN.$FIRST_PANE"
tmux attach -t "$SESSION"
