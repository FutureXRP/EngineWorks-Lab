#!/bin/bash
# Double-click to run EngineWorks Lab locally. Needs Node.js 22+ installed.
cd "$(dirname "$0")"
echo "Starting EngineWorks Lab…"
echo "Your browser will open at http://localhost:8420"
echo "Keep this window open while you play. Close it to stop."
( sleep 1; open "http://localhost:8420" ) &
node server/server.js
