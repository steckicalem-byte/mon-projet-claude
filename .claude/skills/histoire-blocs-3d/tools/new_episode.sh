#!/usr/bin/env bash
# Prépare un dossier d'épisode : dépendances JS (three, police) + Python (alignement, son).
# usage: new_episode.sh dossier [episode_modele]   (modèle par défaut : musique)
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
EP="$1"; MODEL="${2:-musique}"
mkdir -p "$EP"; cd "$EP"
[ -f package.json ] || npm init -y >/dev/null
npm i --silent three@0.170.0 @fontsource/lilita-one@5.1.0
pip install --break-system-packages -q pocketsphinx scipy soundfile 2>/dev/null || pip install -q pocketsphinx scipy soundfile
for f in story.js sfx.json script.txt; do [ -f "$f" ] || cp "$SK/episodes/$MODEL/$f" .; done
echo "prêt : $EP (story.js, sfx.json, script.txt copiés depuis episodes/$MODEL)"
