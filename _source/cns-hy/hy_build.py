"""CNS 301-2 high-yield Instagram carousel (7 slides) + story teaser."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "hy")
os.makedirs(OUT, exist_ok=True)

# Prefer final logo path, fall back to svg/
LOGO_REL = "../../../logo/final/svg/medatlas-logo-horizontal-reversed.svg"
if not os.path.exists(os.path.join(HERE, LOGO_REL)):
    LOGO_REL = "../../../logo/svg/medatlas-horizontal-reversed.svg"
LOGO = f'<img src="{LOGO_REL}" alt="">'

CSS = r"""
@import url("../../tokens.css");
@font-face { font-family: "Space Grotesk"; src: url("../../fonts/SpaceGrotesk-Variable.ttf"); font-weight: 300 700; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: var(--w); height: var(--h); overflow: hidden; }
body { position: relative; font-family: "Space Grotesk", sans-serif; color: #fff; background: #0B1230; -webkit-font-smoothing: antialiased; }
body::before { content: ""; position: absolute; inset: 0;
  background: radial-gradient(55% 40% at 95% 0%, rgba(124, 92, 255, .42), transparent 70%),
              radial-gradient(55% 40% at 0% 100%, rgba(35, 80, 255, .4), transparent 70%),
              radial-gradient(40% 30% at 100% 100%, rgba(33, 227, 192, .12), transparent 70%); }
body::after { content: ""; position: absolute; inset: 0; background-size: 54px 54px;
  background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); }
.frame { position: absolute; inset: 0; padding: 84px; display: flex; flex-direction: column; z-index: 1; }
.top, .bottom { display: flex; align-items: center; justify-content: space-between; }
.top img { height: 46px; }
.bottom { margin-top: auto; font: 500 24px "IBM Plex Mono"; letter-spacing: .04em; opacity: .7; }
.count { font: 500 22px "IBM Plex Mono"; letter-spacing: .08em; padding: 8px 14px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,.35); opacity: .85; }
.label { font: 500 22px "IBM Plex Mono"; letter-spacing: .14em; text-transform: uppercase; color: #B7A6FF; }
.h1 { font-weight: 700; font-size: var(--h1, 92px); line-height: 1.02; letter-spacing: -.035em; }
.h2 { font-weight: 700; font-size: var(--h2, 56px); line-height: 1.08; letter-spacing: -.03em; }
.body { font-size: 30px; line-height: 1.4; opacity: .85; }
.ar { font-family: "IBM Plex Sans Arabic"; direction: rtl; unicode-bidi: isolate; }
.ar-line { font-family: "IBM Plex Sans Arabic"; font-weight: 600; direction: rtl; text-align: left; font-size: 40px; line-height: 1.4; }
.grad { background: linear-gradient(90deg, #B7A6FF, #21E3C0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.chip { display: inline-flex; align-items: center; gap: 10px; border-radius: 999px; padding: 10px 22px; font: 600 26px "Space Grotesk"; border: 2px solid rgba(183,166,255,.45); color: #D4C8FF; }
.rows { display: flex; flex-direction: column; gap: 18px; margin-top: 28px; }
.row { display: grid; grid-template-columns: 210px 1fr; gap: 18px; align-items: start; border-radius: 24px; padding: 22px 26px; background: rgba(255,255,255,.06); border: 1.5px solid rgba(255,255,255,.12); }
.row .k { font: 700 28px "Space Grotesk"; color: #B7A6FF; letter-spacing: -.02em; }
.row .v { font-size: 28px; line-height: 1.35; opacity: .92; }
.bul { list-style: none; margin-top: 26px; }
.bul li { position: relative; padding: 14px 0 14px 42px; font-size: 30px; line-height: 1.35; border-top: 1.5px solid rgba(255,255,255,.1); }
.bul li:first-child { border-top: 0; }
.bul li::before { content: ""; position: absolute; left: 8px; top: 28px; width: 10px; height: 10px; border-radius: 50%; background: #21E3C0; }
.bul b { color: #fff; font-weight: 700; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 24px; }
.card { border-radius: 28px; padding: 28px 26px; background: rgba(255,255,255,.06); border: 1.5px solid rgba(255,255,255,.12); }
.card .t { font: 700 34px "Space Grotesk"; letter-spacing: -.02em; margin-bottom: 14px; }
.card.tet .t { color: #FF8FA3; }
.card.bot .t { color: #21E3C0; }
.card li { font-size: 26px; line-height: 1.4; opacity: .9; padding: 8px 0; list-style: none; position: relative; padding-left: 28px; }
.card li::before { content: ""; position: absolute; left: 0; top: 18px; width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .7; }
.trap { margin-top: 22px; border-radius: 24px; padding: 22px 26px; background: rgba(255,92,122,.12); border: 1.5px solid rgba(255,92,122,.35); }
.trap .k { font: 700 22px "IBM Plex Mono"; letter-spacing: .1em; text-transform: uppercase; color: #FF8FA3; }
.trap .v { font-size: 28px; line-height: 1.35; margin-top: 8px; }
.cta { margin-top: 36px; display: inline-flex; align-items: center; gap: 16px; border-radius: 999px; padding: 22px 36px; background: linear-gradient(135deg, #2350FF, #5B3DF5); font: 700 34px "Space Grotesk"; box-shadow: 0 24px 60px rgba(35,80,255,.4); }
"""


def page(name, w, h, body, extra=""):
    with open(os.path.join(OUT, f"{name}.html"), "w") as f:
        f.write(
            f'<!doctype html><html><head><meta charset="utf-8"><style>:root{{--w:{w}px;--h:{h}px}}{CSS}{extra}</style></head>'
            f'<body><div class="frame">{body}</div></body></html>'
        )


def foot(swipe=True, n=None, total=7):
    right = "swipe →" if swipe else "link in bio"
    left = "@medatlas_eg"
    return f'<div class="bottom"><span>{left}</span><span>{right}</span></div>'


def top(n, total=7, chip=None):
    c = f'<span class="chip">{chip}</span>' if chip else f'<span class="count">{n}/{total}</span>'
    return f'<div class="top">{LOGO}{c}</div>'


# 1 cover
page("hy-01", 1080, 1350, f'''
  {top(1, chip="CNS 301-2")}
  <div style="margin-top:70px"><span class="label">High-yield · قبل الميدترم</span></div>
  <div class="h1" style="--h1:108px;margin-top:22px">Microbiology<br><span class="grad">CNS midterm</span><br>notes.</div>
  <div class="ar-line" style="margin-top:18px;font-size:48px">ملاحظات عالية القيمة من الـ Qbank</div>
  <div class="body" style="margin-top:28px;font-size:32px">Bacterial &amp; fungal nervous system infections · 7 slides</div>
  <div class="rows" style="margin-top:36px">
    <div class="row" style="grid-template-columns:1fr"><div class="v"><b>Meningitis map · CSF · Meningococcus · GBS · Listeria · Crypto · Tetanus vs Botulism · Abscess</b></div></div>
  </div>
  {foot()}
''')

# 2 meningitis map + CSF
page("hy-02", 1080, 1350, f'''
  {top(2)}
  <div style="margin-top:36px"><span class="label">01 · Meningitis map</span></div>
  <div class="h2" style="margin-top:12px">Who is the patient?</div>
  <div class="ar-line" style="margin-top:6px;font-size:36px">اختار الميكروب حسب السن</div>
  <div class="rows">
    <div class="row"><div class="k">Neonate</div><div class="v">GBS · E. coli K1 · <b>Listeria</b></div></div>
    <div class="row"><div class="k">3 mo–2 yr</div><div class="v">Hib · S. pneumoniae · N. meningitidis</div></div>
    <div class="row"><div class="k">Teen / adult</div><div class="v">N. meningitidis · S. pneumoniae</div></div>
    <div class="row"><div class="k">Elderly / ↓CMI</div><div class="v">S. pneumoniae · Listeria · Crypto</div></div>
  </div>
  <div class="trap"><div class="k">Acute bacterial CSF</div><div class="v">Turbid · ↑ neutrophils · ↓ glucose · ↑ protein</div></div>
  {foot()}
''')

# 3 meningococcus
page("hy-03", 1080, 1350, f'''
  {top(3)}
  <div style="margin-top:36px"><span class="label">02 · N. meningitidis</span></div>
  <div class="h2" style="margin-top:12px">Dorm + rash =<br><span class="grad">meningococcus</span></div>
  <ul class="bul">
    <li><b>GN kidney diplococci</b> · capsule · oxidase + · glucose + maltose (acid only)</li>
    <li><b>Petechial rash</b> = endotoxin → vasculitis + DIC (not allergy)</li>
    <li>Culture: <b>chocolate agar</b>, 5% CO₂ · carriers: Thayer-Martin</li>
    <li>Rx: <b>Penicillin G</b> (or ceftriaxone) · contacts: rifampicin / cipro / CTX</li>
    <li>Vaccines: <b>MCV4</b> = A,C,Y,W · serogroup <b>B needs MenB</b></li>
  </ul>
  {foot()}
''')

# 4 GBS + Listeria
page("hy-04", 1080, 1350, f'''
  {top(4)}
  <div style="margin-top:36px"><span class="label">03 · Neonates</span></div>
  <div class="h2" style="margin-top:12px">GBS &amp; Listeria</div>
  <div class="two">
    <div class="card">
      <div class="t" style="color:#B7A6FF">GBS</div>
      <ul>
        <li>GP chains · β-hemolytic · bacitracin R</li>
        <li>Vaginal carriage 15–20%</li>
        <li>During birth → meningitis</li>
        <li>IAP: penicillin / amp at delivery</li>
        <li>Rx: pen/amp + CTX/cefotaxime</li>
      </ul>
    </div>
    <div class="card">
      <div class="t" style="color:#21E3C0">Listeria</div>
      <ul>
        <li>Short GP rod · tumble @ 22 °C</li>
        <li>Grows at 4 °C (fridge)</li>
        <li>Food + placenta / delivery</li>
        <li>Internalin → LLO → actin rockets</li>
        <li>Rx: amp + gentamicin</li>
      </ul>
    </div>
  </div>
  <div class="trap"><div class="k">Exam trap</div><div class="v">Refrigeration does <b>not</b> kill Listeria — it multiplies at 4 °C.</div></div>
  {foot()}
''')

# 5 crypto
page("hy-05", 1080, 1350, f'''
  {top(5)}
  <div style="margin-top:36px"><span class="label">04 · Cryptococcus</span></div>
  <div class="h2" style="margin-top:12px">AIDS + chronic<br>meningitis</div>
  <ul class="bul">
    <li><b>Encapsulated budding yeast</b> · inhale spores (pigeon / dust) · <b>no person-to-person</b></li>
    <li>CSF: lymphocytes · ↓ glucose · ↑ protein · course ≥ 4 weeks</li>
    <li>India ink = <b>halo</b> (negative stain) · best test: <b>CrAg</b> latex</li>
    <li>Culture: Sabouraud → mucoid colonies</li>
    <li>Rx: <b>amphotericin B + flucytosine</b></li>
  </ul>
  {foot()}
''')

# 6 tetanus vs botulism
page("hy-06", 1080, 1350, f'''
  {top(6)}
  <div style="margin-top:28px"><span class="label">05 · Spores &amp; toxins</span></div>
  <div class="h2" style="margin-top:10px;--h2:52px">Tetanus vs botulism</div>
  <div class="two" style="margin-top:20px">
    <div class="card tet">
      <div class="t">Tetanus</div>
      <ul>
        <li>Drumstick spore</li>
        <li>Blocks GABA / glycine</li>
        <li><b>Spastic</b> · lockjaw first</li>
        <li>Clinical diagnosis</li>
        <li>TIG + toxoid · boosters / 10y</li>
      </ul>
    </div>
    <div class="card bot">
      <div class="t">Botulism</div>
      <ul>
        <li>Preformed toxin (food)</li>
        <li>Cleaves SNARE → ↓ ACh</li>
        <li><b>Descending flaccid</b></li>
        <li>Mouse protection test</li>
        <li>Antitoxin + ventilate</li>
      </ul>
    </div>
  </div>
  <div class="trap"><div class="k">Infant botulism</div><div class="v">No honey &lt; 12 months · spores colonize the gut → toxin in vivo.</div></div>
  {foot()}
''')

# 7 abscess + CTA
page("hy-07", 1080, 1350, f'''
  {top(7)}
  <div style="margin-top:36px"><span class="label">06 · Brain abscess</span></div>
  <div class="h2" style="margin-top:12px">Ring-enhancing.<br><span class="grad">Not viruses.</span></div>
  <ul class="bul">
    <li><b>Bacteria</b> commonest · viruses do <b>not</b> cause brain abscess</li>
    <li>Frontal ← sinusitis · Temporal ← otitis · Dental → oral strep + anaerobes</li>
    <li>DKA + facial necrosis → <b>mucor</b> (nonseptate hyphae)</li>
    <li>Best imaging: contrast <b>MRI</b> (ring-enhancing)</li>
  </ul>
  <div class="cta">Full Qbank in Exam Vault →</div>
  <div class="ar-line" style="margin-top:18px;font-size:34px;opacity:.85">CNS → Exam Vault → Midterm Questions + quizzes</div>
  {foot(swipe=False)}
''', ".bul li{font-size:29px}")

# Story teaser 1080x1920
page("hy-story", 1080, 1920, f'''
  <div class="top" style="justify-content:center">{LOGO}</div>
  <div style="margin-top:120px;text-align:center">
    <span class="chip">Tomorrow · بكرة</span>
    <div class="h1" style="--h1:110px;margin-top:40px">CNS midterm<br><span class="grad">high-yield</span></div>
    <div class="ar" style="font-weight:700;font-size:64px;margin-top:28px">ملاحظات الميدترم</div>
    <div class="body" style="margin-top:22px;font-size:34px">7 slides · from the CNS-2 Qbank</div>
  </div>
  <div style="margin:70px 40px 0;border-radius:36px;padding:40px 36px;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.14);text-align:center">
    <div style="font:700 40px Space Grotesk;letter-spacing:-.02em">Post + Reel</div>
    <div class="ar" style="font-weight:600;font-size:36px;margin-top:12px;opacity:.9">بوست الملاحظات + ريل إزاي تستخدم Exam Vault</div>
  </div>
  <div style="flex:1"></div>
  <div class="body" style="text-align:center;font-size:30px;opacity:.75">↓ reminder · <span class="ar">فعّل التذكير</span></div>
  <div style="height:280px"></div>
''', ".frame{padding:150px 84px 200px}")

print("ok", len(os.listdir(OUT)))
