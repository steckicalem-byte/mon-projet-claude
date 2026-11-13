#!/usr/bin/env python3
"""Contrôle qualité d'une vidéo finie : format, images noires, plans figés, niveau sonore, planche-contact.
usage: qa.py final.mp4"""
import json, re, subprocess, sys, os

v = sys.argv[1]
out = os.path.splitext(v)[0] + '_qa'
os.makedirs(out, exist_ok=True)
run = lambda a: subprocess.run(a, capture_output=True, text=True)
info = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', v]).stdout)
dur = float(info['format']['duration'])
vs = [s for s in info['streams'] if s['codec_type'] == 'video'][0]
has_audio = any(s['codec_type'] == 'audio' for s in info['streams'])
log = run(['ffmpeg', '-i', v, '-vf', 'blackdetect=d=0.15:pix_th=0.06,freezedetect=n=0.002:d=0.8', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
black = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', log)
freeze = re.findall(r'freeze_start: ([\d.]+)', log)
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', log)
TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', log)
print(f"{v}: {vs['width']}x{vs['height']} {vs['r_frame_rate']} i/s, {dur:.2f} s, audio={'oui' if has_audio else 'NON'}")
print(f"  loudness intégrée : {I[-1] if I else '?'} LUFS (cible -14), crête vraie : {TP[-1] if TP else '?'} dBFS")
print(f"  images noires (>0,15 s) : {len(black)} {black[:5]}")
print(f"  plans figés (>0,8 s) : {len(freeze)} à {[round(float(x), 1) for x in freeze[:10]]}")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', v, '-vf', f'fps=32/{dur},scale=240:-1,tile=8x4', '-frames:v', '1', f'{out}/planche.jpg'])
print(f"  planche-contact : {out}/planche.jpg")
ok = has_audio and not black and len(freeze) <= 2 and (not I or abs(float(I[-1]) + 14) < 2)
print('  VERDICT :', 'OK' if ok else 'À VÉRIFIER')
