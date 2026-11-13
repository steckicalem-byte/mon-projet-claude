#!/usr/bin/env python3
"""Alignement hors ligne : texte connu + voix -> words.json (début/fin de chaque mot).
usage: align.py voice.(mp3|wav) script.txt words.json
- pocketsphinx (pip install pocketsphinx ; modèle anglais inclus, aucun téléchargement).
- 1) alignement forcé sur le texte exact ; 2) si la voix s'écarte du texte (mot sauté, ajouté),
  repli : reconnaissance libre + appariement des mots (difflib), les mots non retrouvés sont interpolés.
- Les balises [whispering] etc. sont ignorées. Les mots du script sont gardés tels quels pour les sous-titres."""
import difflib, json, re, subprocess, sys
from pocketsphinx import Decoder

voice, script, out = sys.argv[1:4]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                     capture_output=True, check=True).stdout
dur = len(raw) / 2 / 16000
toks = re.sub(r"\[[^\]]*\]", " ", open(script).read()).split()
norm = [re.sub(r"[^a-z']", "", t.lower().replace('a.m.', 'am').replace('p.m.', 'pm')).strip("'") for t in toks]
SKIP = {'<s>', '</s>', '<sil>', '[NOISE]', '[SPEECH]'}

def words_of(d):
    return [(s.word.split('(')[0], s.start_frame / 100, (s.end_frame + 1) / 100) for s in d.seg() if s.word not in SKIP]

times = {}
d = Decoder(samprate=16000)
known = [i for i, n in enumerate(norm) if n and d.lookup_word(n)]
try:
    d.set_align_text(' '.join(norm[i] for i in known))
    d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
    got = words_of(d)
    if d.hyp() is None or len(got) != len(known): raise RuntimeError('alignement forcé incomplet')
    times = {i: (s, e) for i, (_, s, e) in zip(known, got)}
    mode = 'forcé'
except Exception as ex:
    print('alignement forcé impossible (', ex, ') -> repli reconnaissance + appariement')
    d = Decoder(samprate=16000)
    d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
    rec = words_of(d)
    sm = difflib.SequenceMatcher(a=norm, b=[w for w, _, _ in rec], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): times[a + k] = rec[b + k][1:]
    mode = f'appariement ({len(times)}/{len(toks)} mots retrouvés)'

res = []
for i, t in enumerate(toks):
    if i in times: s, e = times[i]
    else:  # interpolation linéaire entre les voisins retrouvés
        p = max([k for k in times if k < i], default=None); q = min([k for k in times if k > i], default=None)
        ps, pe = (times[p] if p is not None else (0.0, 0.0)); qs = times[q][0] if q is not None else dur
        gap = (q if q is not None else len(toks)) - (p if p is not None else -1)
        k = i - (p if p is not None else -1)
        s = pe + (qs - pe) * (k - 1) / gap; e = pe + (qs - pe) * k / gap
    res.append({'w': t, 's': round(s, 3), 'e': round(e, 3)})
for a, b in zip(res, res[1:]):  # monotone
    if b['s'] < a['s']: b['s'] = a['s']
json.dump(res, open(out, 'w'), indent=0)
print(len(res), 'mots,', mode, '— durée voix', round(dur, 2), 's')
