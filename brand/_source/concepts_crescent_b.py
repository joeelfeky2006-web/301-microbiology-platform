"""Crescent option B in non-red colours, plus a large left crescent holding the ECG line.
Run: python3 brand/_source/concepts_crescent_b.py  → brand/logo/concepts-crescent-b/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, BLUE, INDIGO, TEAL  # noqa: E402
from concepts_crescent import crescent, line  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-crescent-b")

GOLD = "#F5B83D"

# crescent() needs thick > ~0.28, otherwise the inner circle sits fully inside the outer one
B_MOON = crescent(100, 28, 17, thick=.38, rot=-40)
BIG_MOON = crescent(50, 64, 50, thick=.32)


def grad(gid, a=BLUE, b=INDIGO):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>')


def b_mark(moon_fill, star=TEAL, defs=""):
    return defs + line() + f'<path d="{B_MOON}" fill="{moon_fill}"/><path d="{spark(106, 23, 8.5)}" fill="{star}"/>'


def big_moon(moon_fill, star=TEAL, defs=""):
    return (defs + f'<path d="{BIG_MOON}" fill="{moon_fill}"/>'
            f'<g transform="translate(64 66) scale(.6) translate(-64 -64)">{line(w=14)}'
            f'<path d="{spark(95, 22, 14)}" fill="{star}"/></g>')


OPTIONS = [
    ("B · Gold crescent", "Gold crescent with the teal AI spark. Warm, Egyptian, and stands out from the blue site.", b_mark(GOLD)),
    ("B · Blue crescent", "Crescent in the brand blue-to-indigo gradient; the teal spark is the only accent.",
     b_mark("url(#cg1)", defs=grad("cg1"))),
    ("B · Teal crescent", "Teal crescent with a gold spark, matching the AI accent colour of the site.", b_mark(TEAL, star=GOLD)),
    ("Left crescent · Gold", "A large crescent on the left holds the ECG + Giza line, with the AI spark inside the curve.",
     big_moon(GOLD)),
    ("Left crescent · Blue", "Same idea in the brand gradient. Works as a complete round badge.",
     big_moon("url(#cg2)", defs=grad("cg2"))),
    ("Left crescent · Teal", "Teal crescent and gold spark around the ECG line.", big_moon(TEAL, star=GOLD)),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · crescent B colours + left crescent")
