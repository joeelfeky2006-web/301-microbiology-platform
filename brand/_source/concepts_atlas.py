"""Option A (pulse M + AI spark) combined with a simplified C1 'atlas' vertebra, superior view.
Run: python3 brand/_source/concepts_atlas.py  → brand/logo/concepts-atlas/sheet.html"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concepts_v3 import main  # noqa: E402
from concepts_hex_spark import spark, knockout, BLUE, INDIGO, TEAL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-atlas")


def smooth(points):
    """Closed Catmull-Rom spline through points, as cubic Bézier SVG path."""
    n = len(points)
    d = f"M{points[0][0]:.2f} {points[0][1]:.2f}"
    for i in range(n):
        p0, p1, p2, p3 = points[i - 1], points[i], points[(i + 1) % n], points[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}"
    return d + " Z"


def mirrored(left):
    """left: points from top-centre down the left side to bottom-centre (x <= 64)."""
    right = [(128 - x, y) for x, y in reversed(left[1:-1])]
    return left + right


def c1(sx=1.0, sy=1.0, ox=0.0, oy=0.0):
    """Atlas (C1): thin anterior arch on top, heavy lateral masses, transverse processes
    with foramina, longer posterior arch below. Returns an even-odd fill path."""
    outer = mirrored([(64, 29), (58, 30), (52, 33), (46, 36.5), (39, 35.5), (32, 37.5), (27, 42), (19, 42), (12, 46),
                      (10, 53), (14, 59), (22, 60), (27, 63), (29, 72), (33, 84), (41, 94), (52, 100), (58, 101.5), (64, 102)])
    inner = mirrored([(64, 38), (58, 39), (54, 43), (53, 48), (49, 52), (46, 59), (45, 68), (48, 78), (55, 86), (64, 89)])
    t = lambda pts: [(ox + 64 + (x - 64) * sx, oy + 64 + (y - 64) * sy) for x, y in pts]
    holes = "".join(
        f" M{ox + 64 + (cx - 64) * sx - r} {oy + 64 + (52 - 64) * sy} a{r} {r} 0 1 0 {2 * r} 0 a{r} {r} 0 1 0 {-2 * r} 0"
        for cx, r in ((17, 3.4 * sx), (111, 3.4 * sx)))
    return smooth(t(outer)) + " " + smooth(t(inner)) + holes


C1 = c1()
# kidney-shaped superior articular facets on the lateral masses
FACETS = ("M30 46 C36 41 44 44 44 52 C44 60 39 66 33 64 C28 62 26 52 30 46 Z "
          "M98 46 C92 41 84 44 84 52 C84 60 89 66 95 64 C100 62 102 52 98 46 Z")
PULSE = "M4 74 H30 L46 46 L62 66 L80 34 L98 74 H124"
SPARK, SPARK2 = spark(97, 22, 12), spark(110, 36, 5)


def pulse(color="currentColor", w=10, d=PULSE):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


def grad(gid, x1=0, y1=128, x2=128, y2=0):
    return (f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>')


def sparks():
    return f'<path d="{SPARK}" fill="{TEAL}"/><path d="{SPARK2}" fill="{TEAL}" opacity=".85"/>'


# the M knocks a gap out of the vertebra so the two never blur together
def m_gap(mid, d=PULSE, w=10, gap=7):
    return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="148" height="148">'
            f'<rect x="-10" y="-10" width="148" height="148" fill="#fff"/>'
            f'<path d="{d}" fill="none" stroke="#000" stroke-width="{w + 2 * gap}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{SPARK}" fill="#000" stroke="#000" stroke-width="8"/></mask>')


SMALL_M = "M47 76 L54 61 L62 71 L71 55 L80 76"
SMALL_SPARK = spark(80, 48, 6.5)

OPTIONS = [
    ("A · Reference", "The chosen mark on its own, for comparison: pulse M, pyramid peaks, AI spark.", f'''
      {pulse("currentColor", 10, "M8 92 H30 L46 56 L62 80 L80 40 L98 92 H120")}
      <path d="{spark(96, 24, 14)}" fill="{TEAL}"/><path d="{spark(110, 40, 5.5)}" fill="{TEAL}" opacity=".85"/>'''),
    ("1 · Atlas behind, soft", "A tinted C1 atlas vertebra sits behind the M. Anatomy is the foundation, and the mark stays the hero.", f'''
      <defs>{grad("g1")}{m_gap("k1")}</defs>
      <g mask="url(#k1)" opacity=".3"><path d="{C1}" fill="url(#g1)" fill-rule="evenodd"/><path d="{FACETS}" fill="#fff" opacity=".5"/></g>
      {pulse()}{sparks()}'''),
    ("2 · Atlas outline", "A fine gradient outline of the atlas vertebra, with the heartbeat M passing through it.", f'''
      <defs>{grad("g2")}{m_gap("k2", gap=5)}</defs>
      <path d="{C1}" fill="none" stroke="url(#g2)" stroke-width="3.2" stroke-linejoin="round" mask="url(#k2)"/>
      {pulse()}{sparks()}'''),
    ("3 · Solid atlas", "A solid gradient vertebra, with the M and spark cut cleanly out of the bone. The most anatomical option.", f'''
      <defs>{grad("g3")}{m_gap("k3", gap=5)}</defs>
      <g mask="url(#k3)"><path d="{C1}" fill="url(#g3)" fill-rule="evenodd"/><path d="{FACETS}" fill="#fff" opacity=".22"/></g>
      {pulse()}{sparks()}'''),
    ("4 · M inside the atlas", "A smaller M sits in the vertebral foramen, framed by the bone, like a seal.", f'''
      <defs>{grad("g4")}{knockout("k4", [SMALL_SPARK], 7)}</defs>
      <g mask="url(#k4)"><path d="{C1}" fill="url(#g4)" fill-rule="evenodd"/><path d="{FACETS}" fill="#fff" opacity=".22"/></g>
      {pulse("currentColor", 6.5, SMALL_M)}<path d="{SMALL_SPARK}" fill="{TEAL}"/>'''),
    ("F · App tile", "Option 2 on the rounded tile, for the app icon and favicon only.", f'''
      <defs>{grad("g5")}{m_gap("k5", gap=5)}</defs>
      <rect x="6" y="6" width="116" height="116" rx="30" fill="url(#g5)"/>
      <g transform="translate(64 64) scale(.78) translate(-64 -64)">
        <path d="{C1}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3.6" stroke-linejoin="round" mask="url(#k5)"/>
        {pulse("#fff")}{sparks()}</g>'''),
]

if __name__ == "__main__":
    main(OPTIONS, OUT, "MedAtlas Egypt · option A + atlas vertebra (C1)")
