#!/usr/bin/env bash
# usage: bash scripts/contact-sheet.sh <dir-of-jpgs|video.mp4> <out.png> [cols=3] [every_s=2] [tile_w=640]
python "$(dirname "$0")/sheet.py" "$@"
