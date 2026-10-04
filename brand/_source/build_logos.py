"""Generates every MedAtlas Egypt logo SVG from one symbol definition.

Text is converted to outlines so the SVGs render identically without the fonts installed.
Run: python3 brand/_source/build_logos.py  (needs fonttools; fonts live in brand/fonts or /tmp/bt/fonts)
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.environ.get("FONT_DIR", "/tmp/bt/fonts")
OUT = os.path.join(ROOT, "logo", "svg")
ICONS = os.path.join(ROOT, "icons")

INK = "#0B1230"       # Midnight Ink
NILE = "#2350FF"      # Nile Blue
INDIGO = "#5B3DF5"    # Atlas Indigo
TEAL = "#21E3C0"      # Culture Teal
SAND = "#F4EBD9"      # Papyrus
WHITE = "#FFFFFF"

_fonts = {}


def font(name):
    if name not in _fonts:
        p = os.path.join(FONT_DIR, name)
        if not os.path.exists(p) and name.startswith("Sora-"):
            from fontTools.varLib.instancer import instantiateVariableFont
            f = TTFont(os.path.join(FONT_DIR, "Sora-Variable.ttf"))
            _fonts[name] = instantiateVariableFont(f, {"wght": int(name[5:8])})
        else:
            _fonts[name] = TTFont(p)
    return _fonts[name]


def text_path(text, fname, size, x=0.0, baseline=0.0, tracking=0.0):
    """Returns (svg path d, advance width) for text laid out on a baseline."""
    f = font(fname)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f["head"].unitsPerEm
    s = size / upm
    pen = SVGPathPen(gs)
    cursor = 0.0
    for i, ch in enumerate(text):
        gname = cmap[ord(ch)]
        tp = TransformPen(pen, (s, 0, 0, -s, x + cursor, baseline))
        gs[gname].draw(tp)
        cursor += gs[gname].width * s
        if i < len(text) - 1:
            cursor += tracking * size
    return pen.getCommands(), cursor


# Symbol on a 128 grid: lens ring (microscope lens / petri dish / globe),
# pulse-line "M" whose peaks are the Giza pyramids, and the AI node as the capstone.
RING = dict(cx=64, cy=64, r=44, w=9)
PULSE = "M12 83 H33 L47 57 L61 74 L78 45 L95 83 H116"
NODE = dict(cx=78, cy=43, r=8.5)
NODE_GAP = 4
SMALL = dict(ring_w=13, pulse_w=14, pulse="M30 84 L45 56 L60 76 L78 46 L98 84", node_r=11, gap=5)


def symbol(mode, uid, tx=0, ty=0, scale=1.0, small=False):
    """mode: light (color, for light bg) | dark (reversed) | black | white.
    small: heavier, tail-less drawing for 16–32 px favicons."""
    ring_w = SMALL["ring_w"] if small else RING["w"]
    pulse_w = SMALL["pulse_w"] if small else 9.5
    pulse = SMALL["pulse"] if small else PULSE
    node_r = SMALL["node_r"] if small else NODE["r"]
    gap = SMALL["gap"] if small else NODE_GAP
    if mode in ("light", "dark"):
        grad = (
            f'<linearGradient id="ring-{uid}" x1="18" y1="110" x2="110" y2="18" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{NILE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>'
        )
        ring_c = f"url(#ring-{uid})"
        pulse_c = INK if mode == "light" else WHITE
        node_c = TEAL
    else:
        grad = ""
        ring_c = pulse_c = node_c = INK if mode == "black" else WHITE
    # transparent gap around the capstone so the symbol works on any background
    mask = (
        f'<mask id="m-{uid}" maskUnits="userSpaceOnUse" x="-8" y="-8" width="144" height="144">'
        f'<rect x="-8" y="-8" width="144" height="144" fill="#fff"/>'
        f'<circle cx="{NODE["cx"]}" cy="{NODE["cy"]}" r="{node_r + gap}" fill="#000"/></mask>'
    )
    return (
        f'<g transform="translate({tx} {ty}) scale({scale})"><defs>{grad}{mask}</defs>'
        f'<g mask="url(#m-{uid})">'
        f'<circle cx="{RING["cx"]}" cy="{RING["cy"]}" r="{RING["r"]}" fill="none" stroke="{ring_c}" stroke-width="{ring_w}"/>'
        f'<path d="{pulse}" fill="none" stroke="{pulse_c}" stroke-width="{pulse_w}" stroke-linecap="round" stroke-linejoin="round"/></g>'
        f'<circle cx="{NODE["cx"]}" cy="{NODE["cy"]}" r="{node_r}" fill="{node_c}"/></g>'
    )


def colors(mode):
    if mode == "light":
        return INK, NILE
    if mode == "dark":
        return WHITE, TEAL
    c = INK if mode == "black" else WHITE
    return c, c


def wordmark(mode, x, y_top, size=84):
    """'MedAtlas' with tracked 'EGYPT' beneath; returns (svg, width, height)."""
    main_c, sub_c = colors(mode)
    cap = size * 0.72
    base1 = y_top + cap
    d1, w1 = text_path("MedAtlas", "Sora-600.ttf", size, x=x, baseline=base1, tracking=-0.02)
    sub_size = size * 0.285
    base2 = base1 + size * 0.50
    d2, w2 = text_path("EGYPT", "Sora-600.ttf", sub_size, x=x + 2, baseline=base2, tracking=0.62)
    # rule fills the remaining width so EGYPT sits as a measured caption under the name
    rule_x = x + 2 + w2 + sub_size * 0.9
    rule_y = base2 - sub_size * 0.36
    rule = f'<rect x="{rule_x:.1f}" y="{rule_y:.1f}" width="{max(0, x + w1 - rule_x):.1f}" height="{sub_size * 0.11:.1f}" rx="1" fill="{sub_c}" opacity="0.55"/>'
    svg = f'<path d="{d1}" fill="{main_c}"/><path d="{d2}" fill="{sub_c}"/>{rule}'
    return svg, w1, base2 - y_top


def write(path, w, h, body, bg=None, title="MedAtlas Egypt"):
    bg_rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    with open(path, "w") as fh:
        fh.write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{bg_rect}{body}</svg>\n"
        )


MODES = {"color": "light", "reversed": "dark", "mono-black": "black", "mono-white": "white"}


def build():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(ICONS, exist_ok=True)
    pad = 24
    for name, mode in MODES.items():
        # horizontal lockup
        wm, ww, wh = wordmark(mode, 0, 0)
        sym_h = 128
        gap = 26
        wm_y = (sym_h - wh) / 2 + pad
        wm_svg, ww, _ = wordmark(mode, pad + sym_h + gap, wm_y)
        w = pad + sym_h + gap + ww + pad
        h = sym_h + 2 * pad
        write(f"{OUT}/medatlas-horizontal-{name}.svg", w, h, symbol(mode, f"h{name}", pad, pad) + wm_svg)

        # stacked lockup
        _, ww, wh = wordmark(mode, 0, 0)
        w = max(ww, 200) + 2 * pad
        sym_size = 168
        sx = (w - sym_size) / 2
        wm_svg, _, _ = wordmark(mode, (w - ww) / 2, pad + sym_size + 30)
        h = pad + sym_size + 30 + wh + pad + 6
        write(f"{OUT}/medatlas-stacked-{name}.svg", w, h, symbol(mode, f"s{name}", sx, pad, sym_size / 128) + wm_svg)

        # wordmark only
        wm_svg, ww, wh = wordmark(mode, pad, pad)
        write(f"{OUT}/medatlas-wordmark-{name}.svg", ww + 2 * pad, wh + 2 * pad + 6, wm_svg)

        # symbol only
        write(f"{OUT}/medatlas-symbol-{name}.svg", 128, 128, symbol(mode, f"y{name}"))

    # app icon tiles (dark tile is the primary app icon)
    tile = lambda fill, mode, uid, r=28: (
        f'<rect width="128" height="128" rx="{r}" fill="{fill}"/>' + symbol(mode, uid, 64 - 64 * 0.8, 64 - 64 * 0.8, 0.8)
    )
    write(f"{OUT}/medatlas-appicon-dark.svg", 128, 128, tile(INK, "dark", "ad"))
    write(f"{OUT}/medatlas-appicon-light.svg", 128, 128, tile(WHITE, "light", "al"))
    # maskable: full bleed, symbol inside the 80% safe zone
    write(f"{ICONS}/icon-maskable.svg", 128, 128,
          f'<rect width="128" height="128" fill="{INK}"/>' + symbol("dark", "mk", 64 - 64 * 0.62, 64 - 64 * 0.62, 0.62))
    write(f"{ICONS}/icon.svg", 128, 128, tile(INK, "dark", "ic"))
    write(f"{ICONS}/favicon-small.svg", 128, 128,
          f'<rect width="128" height="128" rx="30" fill="{INK}"/>' + symbol("dark", "fs", 64 - 64 * 0.86, 64 - 64 * 0.86, 0.86, small=True))

    # Micro 301 product (beta) sub-brand lockup
    for name, mode in (("color", "light"), ("reversed", "dark")):
        main_c, sub_c = colors(mode)
        d1, w1 = text_path("Micro", "Sora-600.ttf", 64, x=pad, baseline=pad + 64 * 0.72 + 10, tracking=-0.01)
        px = pad + w1 + 16
        d2, w2 = text_path("301", "IBMPlexMono-Medium.ttf", 52, x=px + 18, baseline=pad + 64 * 0.72 + 6)
        pill_w = w2 + 36
        d3, w3 = text_path("CULTURING CURIOSITY", "Sora-500.ttf", 17, x=pad + 2, baseline=pad + 104, tracking=0.32)
        beta_x = px + pill_w + 14
        d4, w4 = text_path("BETA", "IBMPlexMono-Medium.ttf", 15, x=beta_x + 11, baseline=pad + 37)
        w = max(beta_x + w4 + 22, pad + w3) + pad
        body = (
            f'<path d="{d1}" fill="{main_c}"/>'
            f'<rect x="{px}" y="{pad + 4}" width="{pill_w:.1f}" height="64" rx="16" fill="{NILE}"/>'
            f'<path d="{d2}" fill="{WHITE}"/>'
            f'<circle cx="{px + pill_w - 2:.1f}" cy="{pad + 6}" r="8" fill="{TEAL}" stroke="{WHITE if mode == "light" else INK}" stroke-width="4"/>'
            f'<rect x="{beta_x:.1f}" y="{pad + 20}" width="{w4 + 22:.1f}" height="24" rx="12" fill="none" stroke="{sub_c}" stroke-width="2"/>'
            f'<path d="{d4}" fill="{sub_c}"/>'
            f'<path d="{d3}" fill="{main_c}" opacity="0.7"/>'
        )
        write(f"{OUT}/micro301-beta-{name}.svg", w, pad + 112 + pad, body, title="Micro 301 — Culturing Curiosity (Beta)")


if __name__ == "__main__":
    build()
    print("\n".join(sorted(os.listdir(OUT))))
