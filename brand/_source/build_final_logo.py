"""Final MedAtlas Egypt logo set: option 4 ECG + Giza line with the teal AI spark, no container.
Wordmark is Space Grotesk Bold (the website font) converted to outlines.
Run: python3 brand/_source/build_final_logo.py  → brand/logo/final/{svg,png,icons}
PNG export needs NODE_PATH with puppeteer-core (see render.js)."""
import os
import subprocess
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_logos  # noqa: E402
from build_logos import text_path, INK, NILE, INDIGO, TEAL, WHITE  # noqa: E402
from concepts_hex_spark import spark  # noqa: E402
from concepts_giza import LINES  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "logo", "final")
SVG, PNG, ICONS = (os.path.join(OUT, d) for d in ("svg", "png", "icons"))

LINE, (SX, SY), (TX, TY) = LINES["4"]
BASELINE = 88
TRACKING = -0.025
NAME = "MedAtlas Egypt"

# mode: (line, spark, small spark, text)
MODES = {
    "color": ("url(#ln)", TEAL, TEAL, INK),
    "reversed": (WHITE, TEAL, TEAL, WHITE),
    "mono-black": (INK, INK, INK, INK),
    "mono-white": (WHITE, WHITE, WHITE, WHITE),
}
GRAD = (f'<defs><linearGradient id="ln" x1="6" y1="0" x2="122" y2="0" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{NILE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient></defs>')

# visible extent of the mark on its 128 grid, including stroke and sparks
MX, MY, MW, MH = 0, 8, 128, 98


def load_font():
    f = TTFont(os.path.join(ROOT, "fonts", "SpaceGrotesk-Variable.ttf"))
    instantiateVariableFont(f, {"wght": 700}, inplace=True)
    build_logos._fonts["SG700"] = f


def mark(mode, w=10, small_spark=True, big_spark=(SX, SY, 13)):
    line, s1, s2, _ = MODES[mode]
    out = (GRAD if line.startswith("url") else "")
    out += (f'<path d="{LINE}" fill="none" stroke="{line}" stroke-width="{w}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')
    if big_spark:
        out += f'<path d="{spark(*big_spark)}" fill="{s1}"/>'
    if small_spark:
        out += f'<path d="{spark(TX, TY, 5.5)}" fill="{s2}" opacity=".85"/>'
    return out


def word(mode, size, x, baseline):
    d, adv = text_path(NAME, "SG700", size, x=x, baseline=baseline, tracking=TRACKING)
    return f'<path d="{d}" fill="{MODES[mode][3]}"/>', adv


def write(name, vb, body):
    x, y, w, h = vb
    with open(os.path.join(SVG, name), "w") as fh:
        fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {w:g} {h:g}" '
                 f'width="{w:g}" height="{h:g}"><title>MedAtlas Egypt</title>{body}</svg>\n')
    return w, h


def horizontal(mode):
    size = 50
    text, adv = word(mode, size, MW + 20, BASELINE)
    return write(f"medatlas-logo-horizontal-{mode}.svg", (MX, MY, MW + 20 + adv + 4, MH), mark(mode) + text)


def stacked(mode):
    size = 40
    _, adv = word(mode, size, 0, 0)
    w = max(adv, MW) + 8
    text, _ = word(mode, size, (w - adv) / 2, MY + MH + 44)
    return write(f"medatlas-logo-stacked-{mode}.svg", (0, MY, w, MH + 58),
                 f'<g transform="translate({(w - MW) / 2:g} 0)">{mark(mode)}</g>' + text)


def symbol(mode):
    return write(f"medatlas-mark-{mode}.svg", (MX, MY, MW, MH), mark(mode))


def tile(scale=.74, w=11, small_spark=True, big_spark=(SX, SY, 13), rx=30, inset=6, pivot=(67, 62)):
    """`pivot` is the mark's optical centre (between its bounding-box centre and its ink centroid,
    which sits right and low because of the sparks and the S dip); it is placed at the tile centre."""
    size = 128 - 2 * inset
    white = mark("reversed", w, small_spark, big_spark)
    return (f'<defs><linearGradient id="tg" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{NILE}"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient></defs>'
            f'<rect x="{inset}" y="{inset}" width="{size}" height="{size}" rx="{rx}" fill="url(#tg)"/>'
            f'<g transform="translate(64 64) scale({scale}) translate({-pivot[0]} {-pivot[1]})">{white}</g>')


def icons():
    write("medatlas-app-icon.svg", (0, 0, 128, 128), tile())
    # 32/48 px: heavier line, no small spark, spark pushed up-right so a clear gap survives
    write("medatlas-favicon.svg", (0, 0, 128, 128),
          tile(scale=.8, w=16, small_spark=False, big_spark=(104, 14, 15), rx=28, inset=0))
    # 16 px: the spark can't stay separate from the peak at this size, so it is dropped
    write("medatlas-favicon-16.svg", (0, 0, 128, 128),
          tile(scale=.84, w=19, small_spark=False, big_spark=None, rx=28, inset=0, pivot=(64, 64)))
    # maskable: full-bleed background, mark inside the 80% safe zone
    write("medatlas-icon-maskable.svg", (0, 0, 128, 128),
          tile(scale=.62, inset=-1, rx=0))


def render(svg_name, png_path, w, h, scale):
    src = os.path.join(SVG, svg_name)
    html = os.path.join("/tmp", "fl_" + svg_name + ".html")
    with open(html, "w") as fh:
        fh.write(f'<html><body style="margin:0;background:transparent">'
                 f'<img src="file://{src}" style="display:block;width:{w}px;height:{h}px"></body></html>')
    subprocess.run(["node", os.path.join(HERE, "render.js"), html, png_path, str(w), str(h), str(scale),
                    "--transparent"], check=True)


def main():
    for d in (SVG, PNG, ICONS):
        os.makedirs(d, exist_ok=True)
    load_font()
    sizes = {}
    for mode in MODES:
        sizes[f"medatlas-logo-horizontal-{mode}"] = horizontal(mode)
        sizes[f"medatlas-logo-stacked-{mode}"] = stacked(mode)
        sizes[f"medatlas-mark-{mode}"] = symbol(mode)
    icons()

    for name, (w, h) in sizes.items():
        target_w = 2400 if "logo" in name else 1024
        scale = target_w / w
        render(f"{name}.svg", os.path.join(PNG, f"{name}.png"), round(w), round(h), round(scale, 3))

    for svg_name, px, out in [
        ("medatlas-app-icon.svg", 512, "icon-512.png"),
        ("medatlas-app-icon.svg", 192, "icon-192.png"),
        ("medatlas-icon-maskable.svg", 512, "icon-maskable-512.png"),
        ("medatlas-icon-maskable.svg", 180, "apple-icon-180.png"),
        ("medatlas-favicon.svg", 48, "favicon-48.png"),
        ("medatlas-favicon.svg", 32, "favicon-32.png"),
        ("medatlas-favicon-16.svg", 16, "favicon-16.png"),
    ]:
        render(svg_name, os.path.join(ICONS, out), px, px, 1)

    from PIL import Image
    ico = [Image.open(os.path.join(ICONS, f"favicon-{n}.png")) for n in (48, 32, 16)]
    ico[0].save(os.path.join(ICONS, "favicon.ico"), sizes=[(48, 48), (32, 32), (16, 16)], append_images=ico[1:])
    sheet()
    print("wrote", OUT)


def sheet():
    def cell(src, bg, h, label):
        return (f'<div class="cell" style="background:{bg}"><img src="svg/{src}" style="height:{h}px">'
                f'<span style="color:{"#fff" if bg != "#fff" else "#5B6785"}">{label}</span></div>')

    rows = [
        cell("medatlas-logo-horizontal-color.svg", "#fff", 110, "Primary · colour"),
        cell("medatlas-logo-horizontal-reversed.svg", INK, 110, "Primary · reversed"),
        cell("medatlas-logo-stacked-color.svg", "#fff", 190, "Stacked · colour"),
        cell("medatlas-logo-stacked-reversed.svg", INK, 190, "Stacked · reversed"),
        cell("medatlas-logo-horizontal-mono-black.svg", "#fff", 80, "One colour · black"),
        cell("medatlas-logo-horizontal-mono-white.svg", INK, 80, "One colour · white"),
    ]
    marks = "".join(cell(f"medatlas-mark-{m}.svg", bg, 120, label) for m, bg, label in [
        ("color", "#fff", "Mark · colour"), ("reversed", INK, "Mark · reversed"),
        ("mono-black", "#fff", "Mark · black"), ("mono-white", INK, "Mark · white")])
    icon_row = "".join(f'<div class="ic"><img src="svg/{s}" style="width:{px}px;height:{px}px'
                       f'{";border-radius:22%" if "maskable" in s else ""}"><span>{lab}</span></div>'
                       for s, px, lab in [("medatlas-app-icon.svg", 160, "App icon"),
                                          ("medatlas-icon-maskable.svg", 160, "Maskable / Apple"),
                                          ("medatlas-favicon.svg", 48, "Favicon 48"),
                                          ("medatlas-favicon.svg", 32, "32"), ("medatlas-favicon-16.svg", 16, "16")])
    html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../tokens.css"><style>
  * {{ box-sizing: border-box; margin: 0; }}
  body {{ width: 1800px; background: #E9EDF6; font-family: Inter; padding-bottom: 34px; }}
  .top {{ background: #060A1C; color: #fff; padding: 26px 44px; display: flex; justify-content: space-between; align-items: center; }}
  .top b {{ font: 700 32px Sora; }} .top span {{ font: 500 16px "IBM Plex Mono"; color: {TEAL}; letter-spacing: .08em; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 26px 34px 0; }}
  .marks {{ grid-template-columns: repeat(4, 1fr); }}
  .cell {{ border-radius: 22px; height: 270px; display: grid; place-items: center; position: relative; box-shadow: 0 10px 30px rgba(11,18,48,.06); }}
  .cell span, .ic span {{ position: absolute; left: 22px; bottom: 16px; font: 500 14px "IBM Plex Mono"; letter-spacing: .06em; }}
  .icons {{ margin: 20px 34px 0; background: #fff; border-radius: 22px; padding: 30px 40px 50px; display: flex; gap: 60px; align-items: flex-end; }}
  .ic {{ position: relative; display: flex; flex-direction: column; align-items: center; }}
  .ic span {{ position: static; margin-top: 12px; color: #5B6785; }}
</style></head><body>
  <div class="top"><b>MedAtlas Egypt · final logo set</b><span>ECG + GIZA · AI SPARK</span></div>
  <div class="grid">{"".join(rows)}</div>
  <div class="grid marks">{marks}</div>
  <div class="icons">{icon_row}</div>
</body></html>'''
    with open(os.path.join(OUT, "sheet.html"), "w") as fh:
        fh.write(html)


if __name__ == "__main__":
    main()
