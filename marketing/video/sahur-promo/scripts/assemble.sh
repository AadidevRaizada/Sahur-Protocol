#!/usr/bin/env bash
# usage: bash scripts/assemble.sh <h|v> <out.mp4>
# Joins the six act segments (out/segments/<h|v>/*.mp4, rendered by render-act.sh) and muxes out/soundtrack.wav.
set -e
ASP="$1"; OUT="$2"
L=out/segments/$ASP/list.txt; : > "$L"
for a in bedroomA journey battle core bedroomB endcard; do
  f="out/segments/$ASP/$a.mp4"; [ -f "$f" ] || { echo "missing $f"; exit 1; }
  echo "file '$a.mp4'" >> "$L"
done
(cd audio-src && python -I mix_from_cues.py ../out/soundtrack.wav)
ffmpeg -y -loglevel error -f concat -safe 0 -i "$L" -i out/soundtrack.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact=p=0 "$OUT"
