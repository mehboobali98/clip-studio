#!/usr/bin/env bash
# Tile captured frames into one contact sheet, to review a storyboard or a
# finished render at a glance.
#
#   bash sheet.sh <frames-dir> <out.png> [columns] [tile-width]
#   bash sheet.sh <video.mp4> <out.png> [columns] [tile-width] [samples]
set -euo pipefail
src="$1"; out="$2"; cols="${3:-6}"; width="${4:-300}"
if [ -d "$src" ]; then
  count=$(ls "$src"/*.png | wc -l | tr -d ' ')
  rows=$(( (count + cols - 1) / cols ))
  ffmpeg -v error -y -pattern_type glob -i "$src/*.png" \
    -vf "scale=${width}:-1,tile=${cols}x${rows}:padding=6:color=0x05060A" -frames:v 1 "$out"
else
  samples="${5:-12}"
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  rows=$(( (samples + cols - 1) / cols ))
  ffmpeg -v error -y -i "$src" \
    -vf "fps=${samples}/${duration},scale=${width}:-1,tile=${cols}x${rows}:padding=6:color=0x05060A" -frames:v 1 "$out"
fi
echo "$out"
