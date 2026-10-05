"""Crescent option B and a large left crescent holding the ECG line, in brand blue/ink with the teal spark only.
Run: python3 brand/_source/concepts_crescent_b.py  → brand/logo/concepts-crescent-b/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, BLUE, INDIGO, TEAL  # noqa: E402
from concepts_crescent import crescent, line  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-crescent-b")

# crescent() needs thick > ~0.28, otherwise the inner circle sits fully inside the outer one
B_MOON = crescent(100, 28, 17, thick=.38, rot=-40)
BIG_MOON = crescent(50, 64, 50, thick=.32)


def grad(gid, a=BLUE, b=INDIGO):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>')


def b_mark(moon_fill, star=TEAL, defs=""):
    return defs + line() + f'<path d="{B_MOON}" fill="{moon_fill}"/><path d="{spark(106, 23, 8.5)}" fill="{star}"/>'


def big_moon(moon_fill, star=TEAL, defs="", ecg="currentColor"):
    return (defs + f'<path d="{BIG_MOON}" fill="{moon_fill}"/>'
            f'<g transform="translate(64 66) scale(.6) translate(-64 -64)">{line(ecg, w=14)}'
            f'<path d="{spark(95, 22, 14)}" fill="{star}"/></g>')


def tile(inner, gid):
    return (grad(gid) + f'<rect x="6" y="6" width="116" height="116" rx="30" fill="url(#{gid})"/>'
            f'<g transform="translate(64 64) scale(.78) translate(-64 -64)">{inner}</g>')


OPTIONS = [
    ("B · Blue crescent", "Crescent in the brand blue-to-indigo gradient; the teal spark is the only accent.",
     b_mark("url(#cg1)", defs=grad("cg1"))),
    ("B · Crescent = ECG colour", "Crescent in the same colour as the ECG line, so the teal spark is the only accent.",
     b_mark("currentColor")),
    ("Left crescent = ECG colour", "One-colour mark: the crescent and the ECG line share a colour, with only the teal AI spark.",
     big_moon("currentColor")),
    ("Left crescent · all blue", "Crescent and ECG line both in the brand gradient, with the teal spark.",
     big_moon("url(#cg3)", defs=grad("cg3"), ecg="url(#cg3)")),
    ("Left crescent · blue moon", "Blue crescent around a dark (or white) ECG line, with the teal spark.",
     big_moon("url(#cg2)", defs=grad("cg2"))),
    ("Bold tile · left crescent", "App icon / favicon: white crescent and ECG on the blue tile.",
     tile(big_moon("#fff", ecg="#fff"), "cg4")),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · crescent, two colours only (blue/ink + teal spark)")
