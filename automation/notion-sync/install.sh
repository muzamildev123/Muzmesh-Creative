#!/usr/bin/env bash
# Install (or reinstall) the launchd job that runs sync.mjs every 5 minutes.
# Uninstall: launchctl bootout gui/$(id -u)/com.muzmesh.notion-sync && rm ~/Library/LaunchAgents/com.muzmesh.notion-sync.plist
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LABEL="com.muzmesh.notion-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE="$(command -v node)"
INTERVAL="${SYNC_INTERVAL_SECONDS:-300}"

[ -f "$HERE/.env" ] || { echo "Create $HERE/.env first (see .env.example)"; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$HERE/sync.mjs</string></array>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HERE/sync.log</string>
  <key>StandardErrorPath</key><string>$HERE/sync.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin</string></dict>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL: syncs every $INTERVAL s. Log: $HERE/sync.log"
