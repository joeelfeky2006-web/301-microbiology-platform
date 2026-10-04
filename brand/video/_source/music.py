"""Synthesises the 15 s ad music bed (120 BPM, A minor) — royalty-free by construction.
Usage: python3 music.py out.wav [duration] [end_card_time]"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
HIT = float(sys.argv[3]) if len(sys.argv) > 3 else 12.9
BEAT = 0.5
N = int(SR * DUR)
rng = np.random.default_rng(301)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lp(x, cutoff, order=2):
    b, a = butter(order, cutoff / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, cutoff, order=2):
    b, a = butter(order, cutoff / (SR / 2), "high")
    return lfilter(b, a, x)


def env(n, a=0.005, d=0.2, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    tail = int(r * SR)
    if tail and tail < n:
        e[-tail:] *= np.linspace(1, 0, tail)
    return e


def add(buf, sig, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in (-detune, 0, detune):
        ph = (t * f * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3


L = np.zeros(N)
R = np.zeros(N)
mono = np.zeros(N)

# Am – F – C – G, one chord per bar (2 s)
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 55, 60), (55, 59, 62)]
ROOTS = [45, 41, 48, 43]
groove_start = 1.7

# pad: detuned saws, filtered, swelling in
for bar in range(int(np.ceil(DUR / 2))):
    t0 = bar * 2.0
    n = int(2.1 * SR)
    chord = CHORDS[bar % 4]
    sig = sum(saw(hz(m), n, 0.004) for m in chord)
    sig = lp(sig, 1400 if t0 >= groove_start else 700) * env(n, a=0.25, d=9, s=0.8, r=0.2)
    add(L, sig * 0.06, t0)
    add(R, np.roll(sig, 240) * 0.06, t0)

# drums + bass + pluck arpeggio once the groove starts
t = groove_start
step = 0
while t < HIT - 0.01:
    bar = int(t // 2.0)
    chord = CHORDS[bar % 4]
    if step % 2 == 0:  # kick on every beat
        n = int(0.35 * SR)
        tt = np.arange(n) / SR
        f = 45 + 110 * np.exp(-tt * 30)
        kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
        add(mono, kick * 0.9, t)
    else:  # off-beat hat
        n = int(0.06 * SR)
        hat = hp(rng.standard_normal(n), 7000) * env(n, 0.001, 0.02)
        add(L, hat * 0.12, t)
        add(R, hat * 0.10, t)
    if step % 4 == 2:  # clap on 2 and 4
        n = int(0.18 * SR)
        clap = hp(lp(rng.standard_normal(n), 3500), 900) * env(n, 0.002, 0.06)
        add(mono, clap * 0.25, t)
    # bass 8ths
    n = int(0.22 * SR)
    b = lp(saw(hz(ROOTS[bar % 4]), n), 380) * env(n, 0.004, 0.18, 0.3, 0.03)
    add(mono, b * 0.45, t)
    # pluck 16ths arpeggio
    for k in range(2):
        tp = t + k * BEAT / 4
        note = chord[(step * 2 + k) % 3] + 12
        n = int(0.2 * SR)
        tt = np.arange(n) / SR
        pl = (np.sin(2 * np.pi * hz(note) * tt) + 0.3 * np.sin(4 * np.pi * hz(note) * tt)) * np.exp(-tt * 22)
        pan = 0.5 + 0.35 * np.sin(step * 0.9 + k)
        add(L, pl * 0.12 * (1 - pan), tp)
        add(R, pl * 0.12 * pan, tp)
    t += BEAT / 2
    step += 1

# riser into the end card
rs = 1.0
n = int(rs * SR)
noise = rng.standard_normal(n)
sweep = np.zeros(n)
for i, c in enumerate(np.linspace(400, 9000, 20)):
    seg = slice(i * n // 20, (i + 1) * n // 20)
    sweep[seg] = hp(noise, c)[seg]
add(L, sweep * np.linspace(0, 0.18, n), HIT - rs)
add(R, sweep * np.linspace(0, 0.18, n), HIT - rs)

# impact + sustained final chord
n = int(2.2 * SR)
tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 2.5)
crash = hp(rng.standard_normal(n), 3000) * np.exp(-tt * 3)
add(mono, boom * 0.9, HIT)
add(L, crash * 0.12, HIT)
add(R, crash * 0.12, HIT)
final = sum(saw(hz(m), n, 0.005) for m in (57, 60, 64, 69))
final = lp(final, 2200) * env(n, 0.01, 4, 0.6, 0.6)
add(L, final * 0.08, HIT)
add(R, np.roll(final, 300) * 0.08, HIT)

L += mono
R += mono
out = np.stack([L, R], 1)
fade = int(0.6 * SR)
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out /= np.max(np.abs(out)) * 1.12
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print("wrote", sys.argv[1])
