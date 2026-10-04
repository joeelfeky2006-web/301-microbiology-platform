"""Hex Cell symbol with an AI spark: six placements on one comparison sheet.
Run: python3 brand/_source/concepts_hex_spark.py  → brand/logo/concepts-hex-spark/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-hex-spark")

HEX = "M64 12 L109 38 V90 L64 116 L19 90 V38 Z"
PULSE = "M6 80 H30 L45 50 L60 72 L77 40 L96 80 H122"
BLUE, INDIGO, TEAL = "#2350FF", "#5B3DF5", "#21E3C0"


def spark(cx, cy, r, k=0.27):
    """Four-point AI sparkle with concave sides."""
    a = k * r
    return (f"M{cx} {cy - r} C{cx + a} {cy - a} {cx + a} {cy - a} {cx + r} {cy} "
            f"C{cx + a} {cy + a} {cx + a} {cy + a} {cx} {cy + r} "
            f"C{cx - a} {cy + a} {cx - a} {cy + a} {cx - r} {cy} "
            f"C{cx - a} {cy - a} {cx - a} {cy - a} {cx} {cy - r} Z")


def knockout(mid, shapes, gap):
    """Mask that cuts a transparent gap around the given spark paths."""
    cut = "".join(f'<path d="{d}" fill="#000" stroke="#000" stroke-width="{gap}" stroke-linejoin="round"/>' for d in shapes)
    return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="148" height="148">'
            f'<rect x="-10" y="-10" width="148" height="148" fill="#fff"/>{cut}</mask>')


def hex_stroke(color=BLUE):
    return f'<path d="{HEX}" fill="none" stroke="{color}" stroke-width="9" stroke-linejoin="round"/>'


def pulse(color="currentColor"):
    return f'<path d="{PULSE}" fill="none" stroke="{color}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>'


GRAD = (f'<linearGradient id="h1" x1="19" y1="116" x2="109" y2="12" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>')

sA = spark(109, 38, 17)
sA2 = spark(122, 18, 6)
sB = spark(92, 28, 12)
sB2 = spark(104, 46, 5)
sC = spark(77, 36, 16)
sE = spark(64, 12, 17)
sF = spark(95, 34, 13)
sF2 = spark(106, 52, 5.5)

OPTIONS = [
    ("4A · Spark on the corner", "The top-right corner of the cell becomes the AI spark, with a tiny second sparkle beside it.", f'''
      <defs>{knockout("k1", [sA, sA2], 10)}</defs>
      <g mask="url(#k1)">{hex_stroke()}{pulse()}</g>
      <path d="{sA}" fill="{TEAL}"/><path d="{sA2}" fill="{TEAL}"/>'''),
    ("4B · Spark inside the cell", "The cell stays whole and the spark sits above the tall peak, like an idea lighting up.", f'''
      {hex_stroke()}{pulse()}
      <path d="{sB}" fill="{TEAL}"/><path d="{sB2}" fill="{TEAL}" opacity=".8"/>'''),
    ("4C · Spark on the summit", "The tall pyramid peak ends in the spark: AI at the top of your studying.", f'''
      <defs>{knockout("k2", [sC], 9)}</defs>
      <g mask="url(#k2)">{hex_stroke()}{pulse()}</g>
      <path d="{sC}" fill="{TEAL}"/>'''),
    ("4D · Teal edge + spark", "Keeps the teal AI edge from option 4 and finishes it with a spark on the corner.", f'''
      <defs>{knockout("k3", [sA], 10)}</defs>
      <g mask="url(#k3)">{hex_stroke()}
        <path d="M64 12 L109 38" fill="none" stroke="{TEAL}" stroke-width="9" stroke-linecap="round"/>{pulse()}</g>
      <path d="{sA}" fill="{TEAL}"/>'''),
    ("4E · Spark at the top", "The spark crowns the top point of the cell. Symmetrical and calm.", f'''
      <defs>{knockout("k4", [sE], 10)}</defs>
      <g mask="url(#k4)">{hex_stroke()}{pulse()}</g>
      <path d="{sE}" fill="{TEAL}"/>'''),
    ("4F · Solid cell", "A filled gradient cell with a white pulse M and the spark. Boldest as an app icon.", f'''
      <defs>{GRAD}{knockout("k5", [PULSE], 0)}</defs>
      <path d="{HEX}" fill="url(#h1)" stroke="url(#h1)" stroke-width="9" stroke-linejoin="round"/>
      <path d="M6 80 H19" stroke="currentColor" stroke-width="9.5" stroke-linecap="round"/>
      <path d="M109 80 H122" stroke="currentColor" stroke-width="9.5" stroke-linecap="round"/>
      <path d="M19 80 H30 L45 50 L60 72 L77 40 L96 80 H109" fill="none" stroke="#fff" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="{sF}" fill="{TEAL}"/><path d="{sF2}" fill="{TEAL}" opacity=".85"/>'''),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · Hex Cell + AI spark")
