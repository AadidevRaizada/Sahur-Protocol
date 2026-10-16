#!/usr/bin/env bash
# usage: bash scripts/render-act.sh <h|v> <act>   (acts: bedroomA journey battle core bedroomB endcard)
# Renders one act's frame range, video only (the soundtrack is muxed once at the end), to out/segments/<aspect>/<act>.mp4
set -e
ASP="$1"; ACT="$2"
case "$ACT" in
  bedroomA) R="0-1409";; journey) R="1410-2399";; battle) R="2400-2975";;
  core) R="2976-3719";; bedroomB) R="3720-4199";; endcard) R="4200-4499";;
  *) echo "unknown act $ACT"; exit 1;;
esac
ID=SahurPromo; [ "$ASP" = "v" ] && ID=SahurPromoVertical
mkdir -p out/segments/$ASP
CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"
npx remotion render src/index.ts "$ID" "out/segments/$ASP/$ACT.mp4" --frames="$R" --muted \
  --browser-executable="$CHROME" --gl=angle --concurrency="${CONC:-4}" --codec=h264 --crf=16 --pixel-format=yuv420p --log=error
echo "DONE $ASP $ACT $R"
