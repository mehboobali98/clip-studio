#!/usr/bin/env bash
# Encode a frame sequence from capture.mjs into an MP4 every platform plays:
# H.264, yuv420p, faststart, tuned for flat-colour animation.
#
#   bash encode.sh <frames-dir> <out.mp4> [fps] [cover-second] [music-file]
#
# cover-second also writes <out>-cover.png from that moment. A music file is
# trimmed to the video, faded in over 0.5 s and out over the last 1.5 s, and
# levelled to about -16 LUFS. LinkedIn autoplays muted, so captions must still
# carry the story.
set -euo pipefail
frames="$1"; out="$2"; fps="${3:-60}"; cover="${4:-}"; music="${5:-}"
video=(-framerate "$fps" -i "$frames/%05d.png")
codec=(-c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -tune animation -movflags +faststart)
if [ -n "$music" ]; then
  count=$(ls "$frames"/*.png | wc -l | tr -d ' ')
  length=$(awk "BEGIN { printf \"%.3f\", $count / $fps }")
  fade=$(awk "BEGIN { printf \"%.3f\", $length - 1.5 }")
  ffmpeg -v error -y "${video[@]}" -i "$music" -map 0:v -map 1:a \
    -af "atrim=0:${length},afade=t=in:d=0.5,afade=t=out:st=${fade}:d=1.5,loudnorm=I=-16:TP=-1.5:LRA=11" \
    "${codec[@]}" -c:a aac -b:a 160k -shortest "$out"
else
  ffmpeg -v error -y "${video[@]}" "${codec[@]}" "$out"
fi
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,duration -of csv=p=0 "$out"
if [ -n "$cover" ]; then
  ffmpeg -v error -y -ss "$cover" -i "$out" -frames:v 1 "${out%.mp4}-cover.png"
  echo "${out%.mp4}-cover.png"
fi
