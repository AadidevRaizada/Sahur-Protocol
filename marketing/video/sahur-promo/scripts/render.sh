#!/usr/bin/env bash
# usage: bash scripts/render.sh <CompositionId> <out.mp4> [extra remotion flags]
set -e
ID="$1"; OUT="$2"; shift 2
CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"
npx remotion render src/index.ts "$ID" "$OUT" --browser-executable="$CHROME" --gl=angle --concurrency=4 --codec=h264 --crf=18 --audio-codec=aac "$@"
