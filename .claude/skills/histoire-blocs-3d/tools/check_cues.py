#!/usr/bin/env python3
"""Affiche chaque repère (cue) avec les mots prononcés autour : vérifie que at('mot', n) vise le bon passage.
usage: check_cues.py cues.json words.json"""
import json, sys
c = json.load(open(sys.argv[1])); w = json.load(open(sys.argv[2]))
for k, v in sorted(((k, v) for k, v in c.items() if isinstance(v, (int, float)) and k not in ('bpm', 'musicRate', 'duration')), key=lambda x: x[1]):
    i = min(range(len(w)), key=lambda j: abs(w[j]['s'] - v))
    ctx = ' '.join(x['w'] for x in w[max(0, i - 3):i]) + ' [' + w[i]['w'] + '] ' + ' '.join(x['w'] for x in w[i + 1:i + 4])
    print(f"{k:>13} {v:6.2f}  {ctx}")
if 'shotStarts' in c:
    print('\n--- débuts de plans ---')
    for n, v in enumerate(c['shotStarts']):
        i = min(range(len(w)), key=lambda j: abs(w[j]['s'] - v))
        print(f"plan {n:2d} {v:6.2f}  " + ' '.join(x['w'] for x in w[max(0, i - 2):i]) + ' [' + w[i]['w'] + '] ' + ' '.join(x['w'] for x in w[i + 1:i + 3]))
    d = [b - a for a, b in zip(c['shotStarts'], c['shotStarts'][1:] + [c['duration']])]
    print(f"durée moyenne d'un plan {sum(d)/len(d):.2f} s, max {max(d):.2f} s (plan {d.index(max(d))}), min {min(d):.2f} s")
