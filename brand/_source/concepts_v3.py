"""Six alternative symbol directions on one comparison sheet.
Writes brand/logo/concepts-v3/sheet.html (+ one SVG per option); render with render.js.
Run: python3 brand/_source/concepts_v3.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concept_v2 import snake_path  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "logo", "concepts-v3")

SNAKE_PYR = snake_path(y_tail=98, y_neck=40, amp=-7, cycles=1.75, body_w=5.5, head_w=8.5, head_len=9)

# Ink parts use currentColor so each option works on light and dark backgrounds.
OPTIONS = [
    ("1 · Pyramid Rod", "A two-tone pyramid split by the Rod of Asclepius. Egypt and medicine in a single solid shape.", f'''
      <defs><mask id="m1" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128"><rect width="128" height="128" fill="#fff"/>
        <path d="{SNAKE_PYR}" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="round"/></mask></defs>
      <g mask="url(#m1)">
        <path d="M64 12 L118 108 H64 Z" fill="#5B3DF5"/><path d="M64 12 L10 108 H64 Z" fill="#2350FF"/>
        <line x1="64" y1="20" x2="64" y2="102" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>
      <path d="{SNAKE_PYR}" fill="#21E3C0"/>'''),
    ("2 · Twin Pyramids", "Two overlapping pyramids form a bold M, with a teal capstone on the taller peak.", '''
      <path d="M8 108 L42 44 L76 108 Z" fill="#2350FF"/>
      <path d="M48 108 L84 30 L120 108 Z" fill="#5B3DF5"/>
      <path d="M48 108 L62 77.5 L76 108 Z" fill="#1B2A9E"/>
      <path d="M84 30 L75.2 49 H92.8 Z" fill="#21E3C0"/>'''),
    ("3 · Atlas Pin", "A map pin, the 'atlas' that guides you, with the pulse-and-pyramids M inside.", '''
      <defs><linearGradient id="g3" x1="20" y1="110" x2="108" y2="10" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2350FF"/><stop offset="1" stop-color="#5B3DF5"/></linearGradient></defs>
      <path d="M64 120 C52 106 20 80 20 52 A44 44 0 0 1 108 52 C108 80 76 106 64 120 Z" fill="url(#g3)"/>
      <path d="M32 64 H42 L52 40 L64 58 L76 36 L86 64 H96" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M70 47 L76 36 L82 47" fill="none" stroke="#21E3C0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'''),
    ("4 · Hex Cell", "A hexagon reads as a cell or molecule. The pulse M crosses it, with one teal edge for the AI.", '''
      <path d="M64 12 L109 38 V90 L64 116 L19 90 V38 Z" fill="none" stroke="#2350FF" stroke-width="9" stroke-linejoin="round"/>
      <path d="M64 12 L109 38" fill="none" stroke="#21E3C0" stroke-width="9" stroke-linecap="round"/>
      <path d="M6 80 H30 L45 50 L60 72 L77 40 L96 80 H122" fill="none" stroke="currentColor" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>'''),
    ("5 · Open Book", "The pages of an open book rise into two pyramid peaks. Learning meets Egypt.", '''
      <path d="M12 98 Q38 86 64 100 Q90 86 116 98" fill="none" stroke="#2350FF" stroke-width="9" stroke-linecap="round"/>
      <path d="M12 98 V82 Q38 70 64 84 Q90 70 116 82 V98" fill="none" stroke="#5B3DF5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
      <path d="M22 76 L42 30 L64 70 L86 30 L106 76" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M78 44 L86 30 L94 44" fill="none" stroke="#21E3C0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'''),
    ("6 · MA Monogram", "A geometric M whose right peak doubles as an A (teal crossbar). Strong as an app icon.", '''
      <defs><linearGradient id="g6" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2350FF"/><stop offset="1" stop-color="#5B3DF5"/></linearGradient></defs>
      <rect x="6" y="6" width="116" height="116" rx="30" fill="url(#g6)"/>
      <path d="M68 66 H96" stroke="#21E3C0" stroke-width="9"/>
      <path d="M26 98 L44 32 L64 76 L84 32 L102 98" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'''),
]


def svg(body, color="#0B1230", size=None):
    s = f' width="{size}" height="{size}"' if size else ""
    return f'<svg viewBox="0 0 128 128"{s} style="color:{color};overflow:visible">{body}</svg>'


def main():
    os.makedirs(OUT, exist_ok=True)
    cards = []
    for i, (name, desc, body) in enumerate(OPTIONS, 1):
        with open(f"{OUT}/option-{i}.svg", "w") as fh:
            fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" style="color:#0B1230">{body}</svg>\n')
        # ids must stay unique when an option appears several times on the page
        uniq = lambda b, k: b.replace('id="m1"', f'id="m1{k}"').replace("url(#m1)", f"url(#m1{k})").replace('id="g3"', f'id="g3{k}"').replace("url(#g3)", f"url(#g3{k})").replace('id="g6"', f'id="g6{k}"').replace("url(#g6)", f"url(#g6{k})")
        cards.append(f'''
      <div class="card">
        <div class="hero">{svg(uniq(body, "a"), size=230)}</div>
        <div class="side">
          <div class="tile">{svg(uniq(body, "b"), color="#fff", size=86)}</div>
          <div class="lock dark">{svg(uniq(body, "c"), color="#fff", size=46)}<img src="../svg/medatlas-wordmark-reversed.svg"></div>
          <div class="lock">{svg(uniq(body, "d"), size=46)}<img src="../svg/medatlas-wordmark-color.svg"></div>
        </div>
        <h3>{name}</h3><p>{desc}</p>
      </div>''')
    html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../tokens.css"><style>
  * {{ box-sizing: border-box; margin: 0; }}
  body {{ width: 1800px; height: 1060px; background: #E9EDF6; font-family: Inter; padding: 0 0 30px; }}
  .top {{ background: #060A1C; color: #fff; padding: 26px 44px; display: flex; justify-content: space-between; align-items: center; }}
  .top b {{ font: 700 32px Sora; }} .top span {{ font: 500 16px "IBM Plex Mono"; color: #21E3C0; letter-spacing: .08em; }}
  .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 26px 34px; }}
  .card {{ background: #fff; border-radius: 26px; padding: 26px; display: grid; grid-template-columns: 260px 1fr; grid-template-rows: auto auto 1fr; column-gap: 22px; box-shadow: 0 10px 30px rgba(11,18,48,.06); }}
  .hero {{ grid-row: 1 / 2; background: #F6F8FC; border-radius: 20px; height: 290px; display: grid; place-items: center; }}
  .side {{ display: flex; flex-direction: column; gap: 14px; justify-content: center; }}
  .tile {{ width: 120px; height: 120px; border-radius: 28px; background: linear-gradient(135deg, #0B1230, #141C46); display: grid; place-items: center; box-shadow: 0 10px 24px rgba(11,18,48,.25); }}
  .lock {{ display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 14px; border: 1px solid #E3E8F3; }}
  .lock img {{ height: 46px; }} .lock.dark {{ background: #0B1230; border-color: #0B1230; }}
  h3 {{ grid-column: 1 / -1; font: 700 26px Sora; color: #0B1230; margin-top: 18px; letter-spacing: -.02em; }}
  p {{ grid-column: 1 / -1; font: 400 17px/1.45 Inter; color: #5B6785; margin-top: 6px; }}
</style></head><body>
  <div class="top"><b>MedAtlas Egypt · symbol options</b><span>PICK ONE OR MIX · FOR REVIEW</span></div>
  <div class="grid">{"".join(cards)}</div>
</body></html>'''
    with open(f"{OUT}/sheet.html", "w") as fh:
        fh.write(html)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
