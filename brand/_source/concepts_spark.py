"""Pulse-line M + AI spark, no container: six variations on one comparison sheet.
Run: python3 brand/_source/concepts_spark.py  → brand/logo/concepts-spark/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, knockout, BLUE, INDIGO, TEAL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-spark")

PULSE = "M8 92 H30 L46 56 L62 80 L80 40 L98 92 H120"


def pulse(color="currentColor", w=10, d=PULSE):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


def grad(gid, x1=8, y1=100, x2=120, y2=30):
    return (f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>')


sA, sA2 = spark(96, 24, 14), spark(110, 40, 5.5)
sB = spark(80, 34, 16)
sC = spark(120, 92, 14)
sD = spark(80, 30, 14)
sE, sE2 = spark(62, 38, 12), spark(73, 24, 5)
sF, sF2 = spark(92, 30, 12), spark(104, 46, 5)

OPTIONS = [
    ("A · Spark beside the peak", "Clean pulse M with the spark floating off the tall peak, plus a tiny sparkle.", f'''
      {pulse()}<path d="{sA}" fill="{TEAL}"/><path d="{sA2}" fill="{TEAL}" opacity=".85"/>'''),
    ("B · Spark on the summit", "The tall pyramid ends in the spark: AI at the top of your studying.", f'''
      <defs>{knockout("k1", [sB], 9)}</defs>
      <g mask="url(#k1)">{pulse()}</g><path d="{sB}" fill="{TEAL}"/>'''),
    ("C · Line ends in a spark", "The heartbeat line runs through the pyramids and lands on the spark: the result.", f'''
      <defs>{knockout("k2", [sC], 9)}</defs>
      <g mask="url(#k2)">{pulse(d="M6 92 H28 L44 56 L60 80 L78 40 L96 92 H120")}</g><path d="{sC}" fill="{TEAL}"/>'''),
    ("D · Solid pyramids", "Two solid gradient pyramids form the M, with the spark as the capstone.", f'''
      <defs>{grad("g1")}{knockout("k3", [sD], 9)}</defs>
      <g mask="url(#k3)"><path d="M8 100 L46 50 L66 76 L80 40 L120 100 Z" fill="url(#g1)"/>
      <path d="M8 100 H120" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></g>
      <path d="{sD}" fill="{TEAL}"/>'''),
    ("E · Gradient line, spark between", "The M drawn in the brand gradient, with the spark rising between the two peaks.", f'''
      <defs>{grad("g2")}</defs>
      {pulse("url(#g2)", 11)}<path d="{sE}" fill="{TEAL}"/><path d="{sE2}" fill="{TEAL}" opacity=".85"/>'''),
    ("F · App tile only", "Same mark as A, placed on the rounded tile for the app icon and favicon only.", f'''
      <defs>{grad("g3", 0, 128, 128, 0)}</defs>
      <rect x="6" y="6" width="116" height="116" rx="30" fill="url(#g3)"/>
      {pulse("#fff", 10, "M20 88 H36 L48 60 L62 80 L78 46 L92 88 H108")}
      <path d="{sF}" fill="{TEAL}"/><path d="{sF2}" fill="{TEAL}" opacity=".85"/>'''),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · pulse M + AI spark (no container)")
