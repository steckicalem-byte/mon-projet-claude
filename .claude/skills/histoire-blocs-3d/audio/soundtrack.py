#!/usr/bin/env python3
"""Bande-son synthétisée (aucun fichier externe, donc aucun souci de droits).

usage: soundtrack.py cues.json sfx.json out_mix.wav [--voice voice.wav] [--stems dir]

- cues.json : exporté par `render.mjs --cues` (temps nommés + courbe musicLevel à 100 Hz + bpm).
- sfx.json  : liste d'événements {"t": "<nom de repère>"|secondes, "dt": décalage, "type": ..., "gain": dB, ...}
  types : boom, crackle, powerdown, siren(dur), thunder, rain(on/off), sparks, blip, creak, growl, stinger,
          whoosh, drone(dur), crowd(dur)
- La musique diégétique (électro 4/4) suit musicLevel : 1 = pleine puissance, < 0.5 = petites enceintes
  (son grêle, coupé dans les graves), 0 = silence total.
- La musique et l'ambiance sont baissées automatiquement sous la voix (side-chain).
"""
import json, sys, argparse
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument('cues'); ap.add_argument('sfx'); ap.add_argument('out')
ap.add_argument('--voice'); ap.add_argument('--stems')
ap.add_argument('--music-db', type=float, default=-14.0)
ap.add_argument('--sfx-db', type=float, default=-8.0)
A = ap.parse_args()
C = json.load(open(A.cues))
EV = json.load(open(A.sfx))
DUR = float(C['duration'])
N = int(DUR * SR)
rng = np.random.default_rng(7)
tt = np.arange(N) / SR

def T(x):
    return float(C[x]) if isinstance(x, str) else float(x)

def db(x): return 10 ** (x / 20)

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def lp(x, f, order=2):
    sos = signal.butter(order, f, 'lowpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def hp(x, f, order=2):
    sos = signal.butter(order, f, 'highpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def env(n, a, d, curve=4.0):
    e = np.ones(n); ai = int(a * SR); di = n - ai
    if ai > 0: e[:ai] = np.linspace(0, 1, ai)
    if di > 0: e[ai:] = np.exp(-np.linspace(0, curve, di))
    return e
def place(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * gain
def noise(n): return rng.standard_normal(n)

# ---------------- bruitages ----------------
def sfx_boom(d=3.0):
    n = int(d * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * (55 * np.exp(-t * 2.5) + 28) * t) * np.exp(-t * 2.2)
    crack = hp(noise(n), 1500) * np.exp(-t * 18)
    rumble = lp(noise(n), 300) * np.exp(-t * 1.4) * 2.5
    debris = bp(noise(n), 2000, 7000) * (rng.random(n) < 0.004) * np.exp(-t * 1.5) * 6
    return np.tanh(1.6 * (low * 1.2 + crack * 0.8 + rumble + debris))
def sfx_crackle(d=1.2):
    n = int(d * SR); t = np.arange(n) / SR
    x = bp(noise(n), 900, 3500) * (0.4 + 0.6 * (rng.random(n) < 0.03))
    gate = (np.sin(2 * np.pi * 13 * t) > -0.2).astype(float)
    return x * gate * env(n, 0.01, 0.1, 2) * 0.8
def sfx_powerdown(d=1.4):
    n = int(d * SR); t = np.arange(n) / SR
    f = 180 * np.exp(-t * 2.2) + 30
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.3
    return lp(x, 1800) * env(n, 0.01, d, 3)
def sfx_siren(d=8.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = np.convolve(np.where((t * 1.4) % 1 < 0.5, 960, 770), np.ones(600) / 600, 'same')
    x = signal.square(2 * np.pi * np.cumsum(f) / SR, 0.5) * 0.25 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    x = bp(x, 400, 4000)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return x * a
def sfx_thunder(d=5.0):
    n = int(d * SR); t = np.arange(n) / SR
    crack = hp(noise(n), 800) * np.exp(-t * 9) * 1.6
    roll = lp(noise(n), 160, 4) * (np.exp(-t * 0.7) * (1 + 0.6 * np.sin(2 * np.pi * 1.3 * t))) * 9
    return np.tanh(crack + roll)
def sfx_sparks(d=0.9):
    n = int(d * SR); t = np.arange(n) / SR
    x = hp(noise(n), 2500) * (rng.random(n) < 0.02) * 4 + bp(noise(n), 3000, 9000) * 0.3
    return x * env(n, 0.002, d, 3) * (np.sin(2 * np.pi * 50 * t) > 0)
def sfx_blip(d=0.6):
    n = int(d * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.005, d, 5) * 0.6
def sfx_creak(d=2.6):
    n = int(d * SR); t = np.arange(n) / SR
    rate = 32 + 18 * np.sin(2 * np.pi * 0.7 * t) + 8 * np.sin(2 * np.pi * 2.3 * t)
    ph = np.cumsum(rate) / SR
    clicks = ((ph % 1) < (rate / SR)).astype(float)
    x = np.zeros(n)
    for f0, q in ((420, 0.0025), (760, 0.0018), (1350, 0.0012)):
        b, a = signal.iirpeak(f0 * (1 + 0.15 * np.sin(2 * np.pi * 0.37)), 25, fs=SR); x += signal.lfilter(b, a, clicks)
    x += lp(noise(n), 200) * 0.2
    return x / (np.abs(x).max() + 1e-9) * np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.4)
def sfx_growl(d=3.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = 46 + 8 * np.sin(2 * np.pi * 3.1 * t) + rng.standard_normal(n).cumsum() * 0.0005
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7 * t)))
    x = lp(x, 500) + lp(noise(n), 250) * 0.6
    return np.tanh(2 * x) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.8)
def sfx_stinger(d=3.5):
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) for f in (36.7, 55, 73.4)) / 3 * np.exp(-t * 1.2)
    x += hp(noise(n), 3000) * np.exp(-t * 10) * 0.3
    x += signal.sawtooth(2 * np.pi * 220 * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))) * 0.08 * np.exp(-t * 1.5)
    return np.tanh(x * 2)
def sfx_whoosh(d=0.8):
    n = int(d * SR); t = np.arange(n) / SR
    x = noise(n); out = np.zeros(n); seg = 2400
    for i in range(0, n, seg):
        c = 300 + 3000 * np.sin(np.pi * i / n) ** 2
        out[i:i + seg] = bp(x[i:i + seg + 200], c * 0.7, c * 1.4)[:min(seg, n - i)]
    return out * np.sin(np.pi * t / d) ** 2
def sfx_crowd(d=3.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(7):
        f = 500 + rng.random() * 500
        v = f * (1 + 0.08 * np.sin(2 * np.pi * (4 + rng.random() * 3) * t)) * (1 - 0.3 * t / d)
        x += signal.sawtooth(2 * np.pi * np.cumsum(v) / SR, 0.5) * (0.3 + 0.7 * rng.random())
    return bp(x, 500, 3500) * np.minimum(1, t / 0.2) * np.exp(-t * 0.6) * 0.25
def sfx_drone(d=10.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.1 * t * (k + 1))) for k, f in enumerate((55, 55.4, 82.4, 110.3)))
    x += lp(noise(n), 120) * 2
    return x / 4 * np.minimum(1, t / 2.5) * np.minimum(1, (d - t) / 1.5)

FX = dict(boom=sfx_boom, crackle=sfx_crackle, powerdown=sfx_powerdown, siren=sfx_siren, thunder=sfx_thunder,
          sparks=sfx_sparks, blip=sfx_blip, creak=sfx_creak, growl=sfx_growl, stinger=sfx_stinger,
          whoosh=sfx_whoosh, crowd=sfx_crowd, drone=sfx_drone)

sfx = np.zeros((N, 2))
amb = np.zeros(N)
rain_on = None
for e in EV:
    t0 = T(e['t']) + e.get('dt', 0)
    if 'lerp' in e:  # {"t": "a", "lerp": ["b", 0.25]} -> a + (b - a) * 0.25
        t0 = T(e['t']) + (T(e['lerp'][0]) - T(e['t'])) * e['lerp'][1] + e.get('dt', 0)
    if e['type'] == 'rain':
        rain_on = (t0, T(e['until']) if 'until' in e else DUR); continue
    kw = {k: e[k] for k in ('d',) if k in e}
    x = FX[e['type']](**kw) * db(e.get('gain', 0))
    pan = e.get('pan', 0.0); l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    for ch, g in ((0, l), (1, r)):
        tmp = np.zeros(N); place(tmp, x, t0); sfx[:, ch] += tmp * g * 1.41

# ambiance : ville la nuit (+ pluie)
city = lp(noise(N), 400) * 0.08 + bp(noise(N), 800, 2500) * 0.01
amb += city
if rain_on:
    a, b = rain_on
    rk = np.clip((tt - a) / 1.5, 0, 1) * np.clip((b - tt) / 1.0, 0, 1)
    rainx = bp(noise(N), 1200, 9000) * 0.15 + lp(noise(N), 600) * 0.075
    drops = hp(noise(N), 3000) * (rng.random(N) < 0.0015) * 1.2
    amb += (rainx + drops) * rk

# ---------------- musique diégétique ----------------
bpm = float(C.get('bpm', 112)); spb = 60 / bpm
lvl = np.interp(tt, np.arange(len(C['musicLevel'])) / C['musicRate'], C['musicLevel'])
music = np.zeros(N)
def kick(n=int(0.35 * SR)):
    t = np.arange(n) / SR; return np.sin(2 * np.pi * (45 + 110 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
def clap(n=int(0.25 * SR)):
    t = np.arange(n) / SR; return bp(noise(n), 900, 4000) * np.exp(-t * 18)
def hat(n=int(0.06 * SR)):
    t = np.arange(n) / SR; return hp(noise(n), 7000) * np.exp(-t * 70)
K, CL, H = kick(), clap(), hat()
roots = [57, 57, 53, 55]  # la - la - fa - sol (MIDI)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
beats = int(DUR / spb) + 1
for b in range(beats):
    t0 = b * spb
    place(music, K, t0, 0.9)
    if b % 2 == 1: place(music, CL, t0, 0.45)
    place(music, H, t0 + spb / 2, 0.25); place(music, H, t0 + spb / 4 * 3, 0.12)
    root = roots[(b // 8) % 4]
    # basse
    n = int(spb * SR * 0.9); t = np.arange(n) / SR
    bass = signal.sawtooth(2 * np.pi * mid(root - 24) * t) * np.exp(-t * 3)
    place(music, lp(bass, 600), t0 + spb / 2, 0.35)
    # accord en « stab » toutes les 2 temps
    if b % 2 == 0:
        n = int(spb * SR * 0.8); t = np.arange(n) / SR
        ch = sum(signal.sawtooth(2 * np.pi * mid(root + iv) * t * (1 + dt)) for iv in (0, 3, 7, 12) for dt in (-0.003, 0.003))
        place(music, lp(ch, 2200) * np.exp(-t * 6) * 0.08, t0, 1)
    # petit arpège
    for k in range(4):
        n = int(spb / 4 * SR); t = np.arange(n) / SR
        note = root + 12 + (0, 7, 12, 3)[(b * 4 + k) % 4]
        place(music, np.sign(np.sin(2 * np.pi * mid(note) * t)) * np.exp(-t * 18) * 0.05, t0 + k * spb / 4, 1)
music = music / (np.abs(music).max() + 1e-9)
tinny = hp(bp(music, 350, 5000), 400) * 1.6
mix_m = music * np.clip((lvl - 0.45) / 0.4, 0, 1) + tinny * np.clip(1 - (lvl - 0.45) / 0.4, 0, 1)
mix_m *= np.clip(lvl * 1.3, 0, 1)

# ---------------- voix + side-chain ----------------
voice = np.zeros(N)
if A.voice:
    v, sr = sf.read(A.voice, always_2d=True); v = v.mean(axis=1)
    if sr != SR: v = signal.resample_poly(v, SR, sr)
    v = v / (np.abs(v).max() + 1e-9) * 0.9
    # niveleur doux : remonte les passages chuchotés (jusqu'à +10 dB) sans toucher aux passages forts
    e = np.sqrt(np.convolve(v ** 2, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')) + 1e-6
    ref = np.percentile(e[e > 0.01], 75)
    g = np.clip((ref / e) ** 0.6, 1.0, 3.2); g[e < 0.004] = 1.0
    g = signal.lfilter([0.0005], [1, -0.9995], np.r_[np.full(1, g[0]), g])[1:] / 1.0
    v = np.tanh(v * g * 1.05) * 0.92
    voice[:min(N, len(v))] = v[:N]
venv = np.sqrt(np.convolve(voice ** 2, np.ones(2400) / 2400, 'same'))
venv = signal.lfilter([0.002], [1, -0.998], venv) * 8
duck = 1 - 0.55 * np.clip(venv, 0, 1)

M = mix_m * db(A.music_db) * duck
AMB = amb * db(-12) * (1 - 0.3 * np.clip(venv, 0, 1))
S2 = sfx * db(A.sfx_db)
out = np.stack([voice, voice], 1) + np.stack([M, M], 1) + np.stack([AMB, AMB], 1) + S2
out = np.tanh(out)  # écrêtage doux ; le niveau final (-14 LUFS) est fait par ffmpeg loudnorm au mux
sf.write(A.out, out, SR, subtype='PCM_16')
if A.stems:
    import os; os.makedirs(A.stems, exist_ok=True)
    for nm, x in (('music', M), ('amb', AMB), ('voice', voice)): sf.write(f'{A.stems}/{nm}.wav', x, SR, subtype='PCM_16')
    sf.write(f'{A.stems}/sfx.wav', S2, SR, subtype='PCM_16')
print('ok', A.out, f'{DUR:.2f} s')
