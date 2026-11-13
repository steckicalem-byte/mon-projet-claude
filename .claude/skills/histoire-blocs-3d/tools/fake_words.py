#!/usr/bin/env python3
"""Timings provisoires mot par mot (avant d'avoir la vraie voix).
usage: fake_words.py script.txt DUREE_S words.json
Répartit les mots selon leur longueur, avec des pauses après la ponctuation.
Les balises de ton entre crochets ([whispering]…) sont ignorées."""
import json, re, sys
txt = re.sub(r"\[[^\]]*\]", " ", open(sys.argv[1]).read())
dur = float(sys.argv[2])
toks = txt.split()
w = []
for t in toks:
    p = 0.0
    if re.search(r"[.!?]\W*$", t): p = 0.45
    elif re.search(r"(,|…|\.\.\.)\W*$", t): p = 0.25
    w.append((t, 0.12 + 0.055 * len(re.sub(r"\W", "", t)), p))
tot = sum(a + b for _, a, b in w)
k = (dur - 0.4) / tot
t, out = 0.2, []
for tok, a, p in w:
    out.append({"w": tok, "s": round(t, 3), "e": round(t + a * k, 3)})
    t += (a + p) * k
json.dump(out, open(sys.argv[3], "w"), indent=0)
print(len(out), "mots, fin", round(t, 2), "s")
