"""Builds the raster MedAtlas Egypt lockup: transparent chrome pyramids + snake icon
with "MedAtlas Egypt" set in Space Grotesk Bold (the website font).
Usage: python3 build_raster_logo.py <icon_cutout.png>  (needs Pillow, fonttools)"""
import os
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "raster")
FONT_VAR = os.path.join(ROOT, "fonts", "SpaceGrotesk-Variable.ttf")
FONT_700 = "/tmp/SpaceGrotesk-700.ttf"
TRACKING = -0.025  # matches Tailwind tracking-tight in the site header

COLORS = {"white": (255, 255, 255, 255), "dark": (15, 23, 42, 255)}  # slate-900, the header's light-mode text


def font(size):
    if not os.path.exists(FONT_700):
        f = TTFont(FONT_VAR)
        instantiateVariableFont(f, {"wght": 700}, inplace=True)
        f.save(FONT_700)
    return ImageFont.truetype(FONT_700, size)


def draw_text(text, size, color):
    """Renders kerned, tight-tracked text onto a tightly cropped transparent image."""
    f = font(size)
    track = TRACKING * size
    width = int(f.getlength(text) + 4 * size)
    img = Image.new("RGBA", (width, int(size * 2)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, ch in enumerate(text):
        x = size + f.getlength(text[:i]) + track * i
        d.text((x, size * 0.3), ch, font=f, fill=color)
    return img.crop(img.getbbox())


def lockup(icon, color, text_ratio=0.30, gap_ratio=0.16, pad_ratio=0.08):
    h = icon.height
    # cap height ≈ 30% of icon height balances the tall symbol
    size = int(h * text_ratio / 0.70)
    text = draw_text("MedAtlas Egypt", size, color)
    gap = int(h * gap_ratio)
    pad = int(h * pad_ratio)
    w = pad + icon.width + gap + text.width + pad
    canvas = Image.new("RGBA", (w, h + 2 * pad), (0, 0, 0, 0))
    canvas.alpha_composite(icon, (pad, pad))
    canvas.alpha_composite(text, (pad + icon.width + gap, pad + (h - text.height) // 2))
    return canvas


def main(src):
    os.makedirs(OUT, exist_ok=True)
    icon = Image.open(src).convert("RGBA")
    icon = icon.crop(icon.getbbox())
    pad = int(icon.height * 0.06)
    sq = max(icon.size) + 2 * pad
    square = Image.new("RGBA", (sq, sq), (0, 0, 0, 0))
    square.alpha_composite(icon, ((sq - icon.width) // 2, (sq - icon.height) // 2))
    square.save(f"{OUT}/medatlas-icon-transparent.png", optimize=True)
    for name, color in COLORS.items():
        lockup(icon, color).save(f"{OUT}/medatlas-logo-{name}-text-transparent.png", optimize=True)
    print("\n".join(sorted(os.listdir(OUT))))


if __name__ == "__main__":
    main(sys.argv[1])
