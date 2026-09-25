#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
PROJECT_ROOT="/Users/pictureon/Documents/shorts-factory"
EXPECTED_REMOTE="https://github.com/ij0209/shorts-factory.git"
LOCK_DIR="$PROJECT_ROOT/.daily-git-snapshot.lock"
LOG_PREFIX="[shorts-factory snapshot]"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "$LOG_PREFIX another snapshot is already running"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

cd "$PROJECT_ROOT"
if [[ ! -d .git ]]; then
  echo "$LOG_PREFIX git repository is not initialized"
  exit 1
fi

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" != "$EXPECTED_REMOTE" ]]; then
  echo "$LOG_PREFIX refusing to push unexpected remote: $REMOTE_URL"
  exit 1
fi

npm run content:catalog
npm run youtube:test

git add -A
FORBIDDEN="$(git diff --cached --name-only | grep -E '(^|/)(\.env($|\.)|\.youtube-token[^/]*\.json$|output/|audio/|temp/|public/generated/|assets/(audio|backgrounds|broll|video)/)' || true)"
if [[ -n "$FORBIDDEN" ]]; then
  echo "$LOG_PREFIX refusing to commit protected files"
  echo "$FORBIDDEN"
  git restore --staged -- $FORBIDDEN 2>/dev/null || true
  exit 1
fi

if git diff --cached --quiet; then
  echo "$LOG_PREFIX no changes"
  exit 0
fi

STAMP="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M KST')"
git commit -m "chore: daily Shorts Factory snapshot $STAMP"
git push origin HEAD:main
echo "$LOG_PREFIX pushed $STAMP"
