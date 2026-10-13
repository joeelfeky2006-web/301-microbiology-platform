"""REP 301 Microbiology Midterm Challenge: announcement post, rules story, countdown story."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_n = [0]


def coin(s):
    _n[0] += 1
    u = _n[0]
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 128 128"><defs><linearGradient id="cg{u}" x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="#2350FF"/><stop offset="1" stop-color="#5B3DF5"/></linearGradient></defs><circle cx="64" cy="64" r="60" fill="url(#cg{u})"/>'
            f'<circle cx="64" cy="64" r="49" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5"/>'
            f'<path d="M64 34 C72.1 55.9 72.1 55.9 94 64 C72.1 72.1 72.1 72.1 64 94 C55.9 72.1 55.9 72.1 34 64 C55.9 55.9 55.9 55.9 64 34 Z" fill="#21E3C0"/></svg>')


LOGO = '<img src="../../../logo/final/svg/medatlas-logo-horizontal-reversed.svg" alt="">'


def prize(zoom=1.0):
    return f'''<div class="prize" style="zoom:{zoom}">
  <div class="k">The winner gets · الفايز ياخد</div>
  <div class="win">{coin(96)}<div><div class="v">50</div><div class="u">Atlas Credits</div></div></div>
</div>'''


def page(name, w, h, body, css=""):
    with open(os.path.join(HERE, "html", f"{name}.html"), "w") as f:
        f.write(f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../comp.css">'
                f'<style>:root{{--w:{w}px;--h:{h}px}}{css}</style></head><body><div class="frame">{body}</div></body></html>')


TITLE = '<span class="sub">Microbiology</span>REP 301<br><span class="rep">Midterm Challenge.</span>'
AR_TITLE = 'تحدّي ميدترم ميكرو REP 301'

page("post-comp-rep-challenge", 1080, 1350, f'''
  <div class="top">{LOGO}<span class="chip rep-c">Thu 15 Oct · 9 PM</span></div>
  <div style="margin-top:44px"><span class="label">New competition · مسابقة جديدة</span></div>
  <div class="h1" style="--h1:112px;margin-top:22px">{TITLE}</div>
  <div class="ar-line" style="margin-top:14px;font-size:52px">{AR_TITLE}</div>
  <div class="body" style="margin-top:10px;font-size:31px">30 MCQs (cases included) on the 2 REP lectures.</div>
  <div style="margin-top:36px">{prize(1)}</div>
  <div class="facts" style="margin-top:22px">
    <div class="fact"><b>Thu 15 Oct · 9 PM</b><span class="ar">الخميس 15 أكتوبر، 9 مساءً</span></div>
    <div class="fact"><b>30 MCQs · 40 min</b><span class="ar">30 سؤال في 40 دقيقة</span></div>
  </div>
  <div class="bottom"><span>@medatlas_eg</span><span>rules in stories · القواعد في الستوري</span></div>''',
     ".fact{padding:16px 24px}.fact b{font-size:31px}")

rules = [
    ("Follow @medatlas_eg on Instagram and join our WhatsApp Channel", "تابعنا على إنستجرام وانضم لقناة الواتساب"),
    ("Sign up on MedAtlas, free", "سجّل على MedAtlas ببلاش"),
    ("Thu 15 Oct · opens 9:00 PM · last entry 9:15 PM", "الخميس 15 أكتوبر: يفتح 9:00 م، وآخر دخول 9:15 م"),
    ("30 MCQs (cases included) · 40 min · 1 attempt", "30 سؤال منهم حالات مرضية، 40 دقيقة، ومحاولة واحدة"),
    ("Highest score wins · tie? fastest wins", "أعلى درجة تكسب، ولو في تعادل الأسرع يكسب"),
    ("Winners checked by university ID + Instagram, announced Fri 16 Oct, 8 PM", "هنتأكد من الفايزين ونعلنهم الجمعة 16 أكتوبر 8 م، مع الإجابات"),
]
rl = "".join(f'<div class="rule"><div class="n">{i}</div><div><div class="en">{en}</div><div class="arx">{ar}</div></div></div>'
             for i, (en, ar) in enumerate(rules, 1))
page("story-comp-rules", 1080, 1920, f'''
  <div class="top">{LOGO}<span class="chip rep-c">Rules · القواعد</span></div>
  <div style="margin-top:44px"><span class="label">REP 301 Microbiology Midterm Challenge</span></div>
  <div class="h1" style="--h1:96px;margin-top:16px">How it <span class="rep">works</span></div>
  <div class="ar-line" style="margin-top:4px;font-size:48px">إزاي تشارك</div>
  <div style="margin-top:22px">{rl}</div>
  <div style="margin-top:8px">{prize(.8)}</div>
  <div class="body" style="margin-top:20px;font-size:25px;opacity:.65">Only your first attempt counts · <span class="ar">أول محاولة بس اللي بتتحسب</span></div>''',
     ".frame{padding:120px 84px 190px}.rule{padding:20px 0}.rule .en{font-size:34px}.rule .arx{font-size:28px}")

page("story-comp-countdown", 1080, 1920, f'''
  <div class="top" style="justify-content:center">{LOGO}</div>
  <div style="margin-top:110px;text-align:center"><span class="label">Thursday 15 Oct · 9:00 PM</span>
  <div class="h1" style="--h1:118px;margin-top:22px">{TITLE}</div>
  <div class="ar" style="font-weight:700;font-size:56px;margin-top:18px">{AR_TITLE}</div>
  <div class="body" style="margin-top:14px;font-size:30px">30 MCQs · 40 min · <span class="ar">الخميس 9 مساءً</span></div></div>
  <div style="margin:48px auto 0">{prize(.95)}</div>
  <div style="flex:1"></div>
  <div class="body" style="text-align:center;font-size:28px;opacity:.7">↓ set a reminder · <span class="ar">فعّل التذكير</span></div>
  <div style="height:290px"></div>''',
     ".frame{padding:150px 84px 200px}.h1 .sub{justify-content:center}")
print("ok")
