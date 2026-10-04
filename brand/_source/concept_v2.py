"""Concept v2 symbol: pulse-line M (two pyramid peaks), no lens ring, Rod of Asclepius
through the centre. Writes SVGs to brand/logo/concept-v2/.
Run: python3 brand/_source/concept_v2.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_logos import INK, NILE, INDIGO, TEAL, WHITE, wordmark, write  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concept-v2")

import math

M_PATH = "M10 100 H28 L45 62 L64 90 L83 62 L100 100 H118"
SMALL_M = "M20 104 L42 58 L64 92 L86 58 L108 104"


def snake_path(y_tail, y_neck, amp, cycles, body_w, head_w, head_len):
    """Filled snake silhouette coiling around x=64: sine centreline with a tapered tail
    and a rounded head that continues along the neck's direction."""
    n = 140
    pts = []
    for i in range(n + 1):
        u = i / n
        y = y_tail + (y_neck - y_tail) * u
        x = 64 + amp * (0.75 + 0.25 * u) * math.sin(2 * math.pi * cycles * u)
        pts.append((x, y))
    # head: extend along the final tangent
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    dx, dy = dx / L, dy / L
    # bend the head outward so it reads as raised
    hx, hy = dx * 0.55 + 0.83 * (1 if dx >= 0 else -1), dy * 0.55 - 0.3
    hl = math.hypot(hx, hy)
    hx, hy = hx / hl, hy / hl
    m = 30
    for i in range(1, m + 1):
        k = i / m
        pts.append((x2 + hx * head_len * k, y2 + hy * head_len * k))
    total = len(pts) - 1
    body_end = n / total

    def width(t):
        if t < 0.18:
            return 1.2 + (body_w - 1.2) * (t / 0.18)
        if t < body_end:
            return body_w
        k = (t - body_end) / (1 - body_end)
        return max(0.0, body_w + (head_w - body_w) * math.sin(math.pi * min(1, k * 1.4) / 2) * 1.0) * math.sqrt(max(0.0, 1 - k ** 3))

    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(total, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, ty) or 1
        nx, ny = -ty / tl, tx / tl
        w = width(i / total) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    poly = left + right[::-1]
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in poly) + " Z"


SNAKE = snake_path(y_tail=80, y_neck=30, amp=-8.5, cycles=1.75, body_w=6, head_w=9.5, head_len=11)
SMALL_SNAKE = snake_path(y_tail=80, y_neck=36, amp=-11, cycles=1.25, body_w=10, head_w=15, head_len=15)


def symbol(mode, uid, tx=0, ty=0, scale=1.0, small=False):
    """mode: light | dark | black | white"""
    m_path, snake = (SMALL_M, SMALL_SNAKE) if small else (M_PATH, SNAKE)
    m_w, staff_w, gap = (15, 11, 4) if small else (9.5, 7, 3)
    y1, y2 = (14, 112) if small else (8, 112)
    if mode in ("light", "dark"):
        m_c = INK if mode == "light" else WHITE
        staff_c = f"url(#st-{uid})"
        snake_c = TEAL
    else:
        m_c = staff_c = snake_c = INK if mode == "black" else WHITE
    # the snake knocks a transparent gap out of the staff and the M so it reads as coiling in front
    return (
        f'<g transform="translate({tx} {ty}) scale({scale})"><defs>'
        f'<linearGradient id="st-{uid}" x1="64" y1="{y2}" x2="64" y2="{y1}" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{NILE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>'
        f'<mask id="k-{uid}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="148" height="148">'
        f'<rect x="-10" y="-10" width="148" height="148" fill="#fff"/>'
        f'<path d="{snake}" fill="#000" stroke="#000" stroke-width="{2 * gap}" stroke-linejoin="round"/></mask></defs>'
        f'<g mask="url(#k-{uid})">'
        f'<path d="{m_path}" fill="none" stroke="{m_c}" stroke-width="{m_w}" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<line x1="64" y1="{y1}" x2="64" y2="{y2}" stroke="{staff_c}" stroke-width="{staff_w}" stroke-linecap="round"/></g>'
        f'<path d="{snake}" fill="{snake_c}"/></g>'
    )


def build():
    os.makedirs(OUT, exist_ok=True)
    pad = 24
    for name, mode in {"color": "light", "reversed": "dark", "mono-black": "black", "mono-white": "white"}.items():
        write(f"{OUT}/symbol-{name}.svg", 128, 128, symbol(mode, f"s{name}"))
        wm_svg, ww, wh = wordmark(mode, pad + 128 + 22, pad + (128 - 84 * 0.72 - 84 * 0.5) / 2 + 2)
        write(f"{OUT}/horizontal-{name}.svg", pad + 128 + 22 + ww + pad, 128 + 2 * pad,
              symbol(mode, f"h{name}", pad, pad) + wm_svg)
    tile = (f'<defs><linearGradient id="tile" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{INK}"/><stop offset="1" stop-color="#141C46"/></linearGradient></defs>'
            f'<rect width="128" height="128" rx="28" fill="url(#tile)"/>')
    write(f"{OUT}/app-icon.svg", 128, 128, tile + symbol("dark", "ai", 64 - 64 * 0.78, 64 - 64 * 0.78, 0.78))
    write(f"{OUT}/favicon-small.svg", 128, 128,
          f'<rect width="128" height="128" rx="30" fill="{INK}"/>' + symbol("dark", "fv", 64 - 64 * 0.9, 64 - 64 * 0.9, 0.9, small=True))
    print("\n".join(sorted(os.listdir(OUT))))


if __name__ == "__main__":
    build()
