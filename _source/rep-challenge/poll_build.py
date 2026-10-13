"""REP 301 Microbiology Midterm Challenge: day poll story (poll sticker goes in the empty box)."""
from comp_build import LOGO, TITLE, AR_TITLE, prize, page

page("story-comp-poll", 1080, 1920, f'''
  <div class="top" style="justify-content:center">{LOGO}</div>
  <div style="margin-top:96px;text-align:center"><span class="label">REP 301 Microbiology Midterm Challenge</span>
  <div class="h1" style="--h1:132px;margin-top:26px">You pick<br><span class="rep">the day.</span></div>
  <div class="ar" style="font-weight:700;font-size:64px;margin-top:20px">انت اللي هتختار اليوم</div>
  <div class="body" style="margin-top:18px;font-size:30px">9–10 PM · 30 MCQs · 40 min</div></div>
  <div class="slot"><span>↓ vote · <span class="ar">صوّت</span></span></div>
  <div style="flex:1"></div>
  <div style="margin:0 auto">{prize(.95)}</div>''',
     ".frame{padding:150px 84px 210px}"
     ".slot{margin:56px auto 0;width:820px;height:420px;border-radius:40px;"
     "display:flex;align-items:flex-start;justify-content:center;padding-top:22px;font:500 26px 'IBM Plex Mono';letter-spacing:.06em;color:rgba(255,255,255,.55)}")
print("ok")
