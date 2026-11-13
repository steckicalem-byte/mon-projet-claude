#!/usr/bin/env bash
# Décortique une vidéo de référence : infos, coupes, planche-contact, audio + transcription.
# usage: analyse_video.sh video.mp4 dossier_sortie
set -euo pipefail
V="$1"; O="$2"; mkdir -p "$O"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of default=nw=1 "$V" | tee "$O/info.txt"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
# coupes (changements de plan)
ffmpeg -v info -i "$V" -vf "select='gt(scene,0.30)',showinfo" -an -f null - 2>&1 | grep -o "pts_time:[0-9.]*" | cut -d: -f2 > "$O/cuts.txt" || true
N=$(wc -l < "$O/cuts.txt"); echo "coupes: $N  -> plan moyen $(python3 -c "print(round($D/($N+1),2))") s"
# planche-contact : 32 images réparties sur toute la durée
ffmpeg -v error -y -i "$V" -vf "fps=32/$D,scale=288:-1,tile=8x4" -frames:v 1 "$O/planche.jpg"
# audio 16 kHz mono + transcription approximative hors ligne
ffmpeg -v error -y -i "$V" -ar 16000 -ac 1 "$O/audio.wav"
python3 - "$O/audio.wav" > "$O/transcription.txt" <<'PY' || echo "(pip install pocketsphinx pour la transcription)"
import sys, wave
from pocketsphinx import Decoder
w = wave.open(sys.argv[1], 'rb'); d = Decoder(samprate=16000)
d.start_utt(); d.process_raw(w.readframes(w.getnframes()), full_utt=True); d.end_utt()
print(d.hyp().hypstr if d.hyp() else '')
PY
echo "mots/s ≈ $(python3 -c "print(round(len(open('$O/transcription.txt').read().split())/$D,2))")"
echo "-> $O/planche.jpg, $O/cuts.txt, $O/transcription.txt"
