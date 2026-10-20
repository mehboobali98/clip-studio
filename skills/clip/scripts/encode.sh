#!/usr/bin/env bash
# Encode a frame sequence from capture.mjs into an MP4 every platform plays:
# H.264, yuv420p, faststart, tuned for flat-colour animation.
#
#   bash encode.sh <frames-dir> <out.mp4> [fps] [cover-second]
#
# With cover-second, it also writes <out>-cover.png from that moment.
set -euo pipefail
frames="$1"; out="$2"; fps="${3:-60}"; cover="${4:-}"
ffmpeg -v error -y -framerate "$fps" -i "$frames/%05d.png" \
  -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -tune animation -movflags +faststart "$out"
ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "$out"
if [ -n "$cover" ]; then
  ffmpeg -v error -y -ss "$cover" -i "$out" -frames:v 1 "${out%.mp4}-cover.png"
  echo "${out%.mp4}-cover.png"
fi
