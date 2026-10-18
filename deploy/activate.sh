#!/usr/bin/env bash
# Switch the server to a freshly uploaded release; roll back if it doesn't come up.
# Usage (on the server): deploy/activate.sh <release-id>
# A release is the contents of .next/standalone after `pnpm bundle`, uploaded to
# $APP/releases/<release-id>/ (it includes deploy/ecosystem.config.cjs).
set -euo pipefail

APP=/home/jupiter_jots_website
REL="$APP/releases/$1"
PORT=3010
KEEP=5

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

[ -f "$REL/server.js" ] || { echo "No server.js in $REL"; exit 1; }
PREV=$(readlink -f "$APP/current" 2>/dev/null || true)

ln -sfn "$REL" "$APP/current"
cp "$REL/deploy/ecosystem.config.cjs" "$APP/ecosystem.config.cjs"
pm2 startOrReload "$APP/ecosystem.config.cjs" --update-env

healthy() {
  for _ in $(seq 1 30); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")" = "200" ] && return 0
    sleep 1
  done
  return 1
}

if ! healthy; then
  echo "Release $1 did not answer 200 on :$PORT"
  pm2 logs jupiter_jots_website --lines 40 --nostream || true
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    echo "Rolling back to $PREV"
    ln -sfn "$PREV" "$APP/current"
    pm2 startOrReload "$APP/ecosystem.config.cjs" --update-env
  fi
  exit 1
fi

pm2 save >/dev/null
echo "Live: $1"

# Keep the newest $KEEP releases (never the live one).
LIVE=$(readlink -f "$APP/current")
ls -1dt "$APP"/releases/*/ | sed 's:/$::' | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$old" = "$LIVE" ] || rm -rf "$old"
done
