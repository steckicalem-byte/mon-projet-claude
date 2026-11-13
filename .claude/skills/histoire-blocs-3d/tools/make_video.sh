#!/usr/bin/env bash
# Chaîne complète une fois voice.(mp3|wav), script.txt, story.js et sfx.json prêts dans le dossier épisode.
# usage: make_video.sh dossier_episode [W H WORKERS]
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
EP="$(cd "$1" && pwd)"; W="${2:-720}"; H="${3:-1280}"; WK="${4:-2}"
cd "$EP"
VOICE=$(ls voice.* | head -1)
python3 "$SK/tools/align.py" "$VOICE" script.txt words.json
node "$SK/engine/render.mjs" --ep . --cues cues.json
python3 "$SK/tools/check_cues.py" cues.json words.json > cues_check.txt
python3 "$SK/audio/soundtrack.py" cues.json sfx.json mix.wav --voice "$VOICE"
node "$SK/engine/render.mjs" --ep . --w "$W" --h "$H" --workers "$WK" --out raw.mp4
# agrandissement 1080x1920 + niveau -14 LUFS
ffmpeg -v error -y -i raw.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4
python3 "$SK/tools/qa.py" final.mp4
echo "-> $EP/final.mp4"
