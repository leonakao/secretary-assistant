#!/usr/bin/env bash
# Reads the user's prompt from stdin (UserPromptSubmit hook input).
# If the prompt is asking to invoke the dev team, creates the tmux layout.

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // .prompt // .message // ""' 2>/dev/null || echo "")

# Bail early if prompt doesn't mention invoking the team
if ! echo "$PROMPT" | grep -qiE '(invoke|start|launch|spin.?up|create|set.?up).*(dev.?team|agent.?team|development.?team)'; then
  exit 0
fi

SESSION="dev-team"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "{\"systemMessage\": \"tmux session '$SESSION' already exists — switch with: tmux switch-client -t $SESSION\"}"
  exit 0
fi

PANE_TITLES=("main-chat" "product-owner" "architect" "software-engineer" "code-reviewer" "qa-tester")

tmux new-session -d -s "$SESSION"
tmux rename-window -t "$SESSION" "standard"

for i in $(seq 1 $(( ${#PANE_TITLES[@]} - 1 ))); do
  tmux split-window -t "$SESSION" -v
done

tmux select-layout -t "$SESSION" main-vertical

for i in "${!PANE_TITLES[@]}"; do
  tmux select-pane -t "$SESSION:0.$i" -T "${PANE_TITLES[$i]}"
done

tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format " #{?pane_active,#[bold],}#{pane_title} "
tmux select-pane -t "$SESSION:0.0"

echo "{\"systemMessage\": \"tmux layout ready — switch with: tmux switch-client -t $SESSION  (or: Ctrl+b s)\"}"
