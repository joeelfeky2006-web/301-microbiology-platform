"""Option 4 (ECG + Giza) combined with a red crescent, as in the Red Crescent emblem.
Run: python3 brand/_source/concepts_crescent.py  → brand/logo/concepts-crescent/sheet.html"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, BLUE, INDIGO, TEAL  # noqa: E402
from concepts_giza import LINES  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-crescent")

RED = "#E5202E"
LINE = LINES["4"][0]


def crescent(cx, cy, R, thick=0.42, rot=0):
    """Crescent from an outer circle minus an inner circle shifted toward the opening.
    `thick` is the widest band as a fraction of R; `rot` turns the opening (0 = opens right)."""
    r = R * 0.86
    d = R * thick + r - R
    x = (R * R - r * r + d * d) / (2 * d)
    y = math.sqrt(max(R * R - x * x, 0))
    outer_large = 1 if x > 0 else 0
    inner_large = 1 if x > d else 0
    a = math.radians(rot)

    def p(px, py):
        return f"{cx + px * math.cos(a) - py * math.sin(a):.2f} {cy + px * math.sin(a) + py * math.cos(a):.2f}"

    return (f"M{p(x, -y)} A{R} {R} 0 {outer_large} 0 {p(x, y)} "
            f"A{r:.2f} {r:.2f} 0 {inner_large} 1 {p(x, -y)} Z")


def line(color="currentColor", w=10, extra=""):
    return (f'<path d="{LINE}" fill="none" stroke="{color}" stroke-width="{w}" '
            f'stroke-linecap="round" stroke-linejoin="round"{extra}/>')


def replace_spark(color="currentColor"):
    return (line(color) + f'<path d="{crescent(97, 24, 14, rot=-35)}" fill="{RED}"/>'
            f'<path d="{spark(112, 40, 5.5)}" fill="{TEAL}" opacity=".9"/>')


def cradle_spark(color="currentColor"):
    return (line(color) + f'<path d="{crescent(100, 28, 17, thick=.38, rot=-40)}" fill="{RED}"/>'
            f'<path d="{spark(106, 23, 8.5)}" fill="{TEAL}"/>')


def moon_rising(color="currentColor", mid="#fff", gid="cm1"):
    # the line is drawn over the moon with a gap so the trace stays readable
    return (f'<defs><mask id="{gid}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">'
            f'<rect width="128" height="128" fill="#fff"/>{line("#000", 18)}</mask></defs>'
            f'<path d="{crescent(80, 40, 32, thick=.32, rot=200)}" fill="{RED}" mask="url(#{gid})"/>'
            + line(color) + f'<path d="{spark(110, 18, 7)}" fill="{TEAL}"/>')


def crescent_only(color="currentColor"):
    return line(color) + f'<path d="{crescent(100, 28, 16, thick=.4, rot=-35)}" fill="{RED}"/>'


def tile(inner, gid):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient></defs>'
            f'<rect x="6" y="6" width="116" height="116" rx="30" fill="url(#{gid})"/>'
            f'<g transform="translate(64 66) scale(.74) translate(-64 -62)">{inner}</g>')


def tile_line(w=11):
    return line("#fff", w)


OPTIONS = [
    ("A · Crescent for the spark", "The big AI spark becomes a red crescent; the small teal spark stays for AI.", replace_spark()),
    ("B · Crescent + star", "A red crescent holding the teal AI spark, like the crescent and stars of Egypt's old flag.", cradle_spark()),
    ("C · Moon over Giza", "A large red crescent wraps the tallest pyramid like a moon behind it, the ECG line passes in front.", moon_rising()),
    ("D · Crescent only", "Pure medical: ECG + Giza with the Red Crescent, no AI spark.", crescent_only()),
    ("Bold tile · B", "App icon / favicon version of B.",
     tile(tile_line() + f'<path d="{crescent(100, 28, 17, thick=.38, rot=-40)}" fill="#fff"/>'
          f'<path d="{spark(106, 23, 8.5)}" fill="{TEAL}"/>', "ct1")),
    ("Bold tile · A", "App icon / favicon version of A.",
     tile(tile_line() + f'<path d="{crescent(97, 24, 14, rot=-35)}" fill="#fff"/>'
          f'<path d="{spark(112, 40, 5.5)}" fill="{TEAL}"/>', "ct2")),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · ECG + Giza + Red Crescent")
