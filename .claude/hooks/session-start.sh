#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Output current project phase status so the agent is briefed automatically
if [ -f "$REPO_ROOT/project-status.json" ] && [ -f "$REPO_ROOT/scripts/status.js" ]; then
  node "$REPO_ROOT/scripts/status.js"
else
  echo "⚠️  project-status.json or scripts/status.js not found — run from repo root."
fi
