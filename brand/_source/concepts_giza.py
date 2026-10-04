"""Option A refined: the line is an ECG trace and the three pyramids of Giza at once, plus bold tiles.
Run: python3 brand/_source/concepts_giza.py  → brand/logo/concepts-giza/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, BLUE, INDIGO, TEAL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-giza")

# Baseline y=88. Peaks are straight-sided so each one reads as a pyramid.
LINES = {
    # Khufu + Khafre form the M, Menkaure follows as the small third pyramid
    "1": ("M6 88 H20 L39 50 L55 72 L75 30 L94 88 L104 70 L114 88 H122", (96, 22), (109, 38)),
    # ECG order: small P wave (Menkaure), then the M as the QRS with an S dip below the baseline
    "2": ("M4 88 H12 L22 72 L32 88 L49 50 L63 71 L81 28 L95 100 L102 88 H124", (103, 24), (116, 40)),
    # Khafre tallest in the middle, like the classic Giza skyline, S dip after the spike
    "3": ("M4 88 H14 L33 54 L48 76 L66 28 L82 98 L88 88 L98 68 L108 88 H124", (92, 30), (104, 46)),
    # option 1 with a true QRS: the tall peak drops below the baseline before Menkaure (the T wave)
    "4": ("M6 88 H20 L39 50 L55 72 L75 30 L91 100 L97 88 L106 70 L115 88 H122", (95, 22), (108, 38)),
}


def mark(key, color="currentColor", w=10):
    d, (sx, sy), (tx, ty) = LINES[key]
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{spark(sx, sy, 13)}" fill="{TEAL}"/><path d="{spark(tx, ty, 5.5)}" fill="{TEAL}" opacity=".85"/>')


def bold_tile(key, gid):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient></defs>'
            f'<rect x="6" y="6" width="116" height="116" rx="30" fill="url(#{gid})"/>'
            f'<g transform="translate(64 66) scale(.74) translate(-64 -62)">{mark(key, "#fff", 11)}</g>')


OPTIONS = [
    ("1 · M + Menkaure", "Khufu and Khafre form the M, and small Menkaure follows. Reads as the M first, then as the three pyramids.", mark("1")),
    ("2 · ECG order (P-QRS)", "A small P wave (Menkaure), then the M as the QRS spike, dipping below the baseline like a real ECG.", mark("2")),
    ("3 · Classic Giza skyline", "The middle peak is tallest, like the famous Giza view, with a sharp ECG spike.", mark("3")),
    ("4 · M + true QRS + T", "Option 1 with a real QRS: the tall peak drops below the baseline, and Menkaure becomes the T wave.", mark("4")),
    ("Bold tile · option 1", "App icon / favicon version of option 1 (F style).", bold_tile("1", "t1")),
    ("Bold tile · option 4", "App icon / favicon version of option 4 (F style).", bold_tile("4", "t4")),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · ECG pulse + 3 pyramids of Giza")
