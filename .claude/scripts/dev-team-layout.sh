#!/usr/bin/env bash
#
# dev-team-layout.sh — Set up a tmux layout for Claude agent team sessions.
#
# Usage:
#   ./dev-team-layout.sh [preset] [session-name]
#
# Presets:
#   small     — main + 3 agents  (product-owner, architect, software-engineer)
#   standard  — main + 5 agents  (full development team)  [default]
#   parallel  — main + 6 agents  (standard + extra software-engineer for parallel work)
#
# Examples:
#   ./dev-team-layout.sh
#   ./dev-team-layout.sh standard my-feature
#   ./dev-team-layout.sh parallel sprint-42

PRESET=${1:-"standard"}
SESSION=${2:-"dev-team"}

# ─── Presets ────────────────────────────────────────────────────────────────

case "$PRESET" in
  small)
    PANE_TITLES=("main-chat" "product-owner" "architect" "software-engineer")
    ;;
  standard)
    PANE_TITLES=("main-chat" "product-owner" "architect" "software-engineer" "code-reviewer" "qa-tester")
    ;;
  parallel)
    PANE_TITLES=("main-chat" "product-owner" "architect" "sw-engineer-1" "sw-engineer-2" "code-reviewer" "qa-tester")
    ;;
  *)
    echo "Unknown preset: '$PRESET'"
    echo "Available presets: small, standard, parallel"
    exit 1
    ;;
esac

# ─── Attach if session already exists ───────────────────────────────────────

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session '$SESSION' already exists — attaching."
  tmux attach -t "$SESSION"
  exit 0
fi

# ─── Create session and panes ───────────────────────────────────────────────

tmux new-session -d -s "$SESSION" -x "$(tput cols)" -y "$(tput lines)"
tmux rename-window -t "$SESSION" "$PRESET"

# First pane is already created (index 0 = main-chat)
# Create one additional pane per agent
for i in $(seq 1 $(( ${#PANE_TITLES[@]} - 1 ))); do
  tmux split-window -t "$SESSION" -v
done

# Apply layout: one tall pane on the left, rest stacked on the right
tmux select-layout -t "$SESSION" main-vertical

# Label each pane
for i in "${!PANE_TITLES[@]}"; do
  tmux select-pane -t "$SESSION:0.$i" -T "${PANE_TITLES[$i]}"
done

# Show pane titles in the border
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{?pane_active,#[bold],}#{pane_title} "

# Focus main-chat pane
tmux select-pane -t "$SESSION:0.0"

echo "Ready: session='$SESSION', preset='$PRESET' (${#PANE_TITLES[@]} panes)"
tmux attach -t "$SESSION"
