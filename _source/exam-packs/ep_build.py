"""Exam packs post, slides 2-4 (one per system)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = '<img src="../../../logo/final/svg/medatlas-logo-horizontal-reversed.svg" alt="">'
CSS = """
.frame{padding:84px}
.sys{margin-top:var(--mt,202px)}
.sys .code{font-weight:700;font-size:var(--code,150px);line-height:1.02;letter-spacing:-.035em;color:var(--c)}
.sys .name{font-weight:700;font-size:var(--name,64px);line-height:1.06;letter-spacing:-.03em;margin-top:var(--nm,23px)}
.sys .arn{font-family:"IBM Plex Sans Arabic";font-weight:600;direction:rtl;text-align:left;font-size:46px;line-height:1.5;margin-top:6px}
.sys .lab{font:500 22px "IBM Plex Mono";letter-spacing:.14em;text-transform:uppercase;color:var(--c);margin-top:26px}
ul{list-style:none;margin-top:var(--ulm,28px);font-size:var(--fs,32px);line-height:var(--lh,1.7);opacity:.82}
ul.two{display:grid;grid-template-columns:1fr 1fr;column-gap:24px;--fs:28px;--lh:1.6}
li{position:relative;padding-left:37px}
li::before{content:"";position:absolute;left:9px;top:calc(var(--lh,1.7)*var(--fs,32px)/2 - 4px);width:8px;height:8px;border-radius:50%;background:currentColor}
li.sub{grid-column:1/-1;font-weight:600;padding-left:0;opacity:1}li.sub::before{display:none}
.chips{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:var(--cm,32px)}
.chip{border-radius:999px;padding:12px 22px;font:600 26px "Space Grotesk";border:2px solid rgba(255,255,255,.22);background:rgba(11,18,48,.6)}
"""
CHIPS = "".join(f'<span class="chip">{c}</span>' for c in ["High-yield notes", "Recordings", "Mind maps", "Question bank", "Dr. Atlas cases"])


def slide(name, n, code, color, en, ar, items, extra="", label=""):
    two = ' class="two"' if len(items) > 4 else ""
    lis = "".join(f'<li class="sub">{i[1:]}</li>' if i.startswith("#") else f"<li>{i}</li>" for i in items)
    lab = f'<div class="lab">{label}</div>' if label else ""
    html = (f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../launch.css">'
            f'<style>:root{{--w:1080px;--h:1350px}}{CSS}{extra}</style></head><body class="dark glow grid"><div class="frame">'
            f'<div class="top">{LOGO}<span class="count">{n}/5</span></div>'
            f'<div class="sys" style="--c:{color}"><div class="code">{code}</div><div class="name">{en}</div><div class="arn">{ar}</div>{lab}<ul{two}>{lis}</ul>'
            f'<div class="chips">{CHIPS}</div></div>'
            f'<div class="bottom"><span>@medatlas_eg</span><span>swipe →</span></div></div></body></html>')
    open(os.path.join(HERE, "ep", f"{name}.html"), "w").write(html)


if __name__ == "__main__" and sys.argv[1:] == ["orig"]:
    slide("orig-04", 4, "REP", "var(--rep)", "Reproductive System", "الجهاز التناسلي",
          ["Sexually transmitted infections", "Genital ulcers", "Reproductive microbiology"])

if __name__ == "__main__" and not sys.argv[1:]:
    TWO = "ul.two{grid-auto-flow:column;grid-template-rows:repeat(4,auto)}"
    slide("post-05-exam-packs-02", 2, "CNS", "var(--cns)", "Central Nervous System", "الجهاز العصبي",
          ["Bacterial &amp; fungal meningitis", "Neisseria meningitidis", "Streptococcus agalactiae", "Listeriosis",
           "Cryptococcal meningitis", "Brain abscess", "Tetanus", "Botulism"],
          TWO, "CNS 301-2 · Midterm topics")
    slide("post-05-exam-packs-03", 3, "URS", "var(--urs)", "Urinary System", "الجهاز البولي",
          ["Bacterial &amp; fungal urinary infections", "Post-streptococcal glomerulonephritis", "Leptospirosis", "Sterile pyuria"],
          "", "URS 301 · Midterm topics")
    slide("post-05-exam-packs-04", 4, "REP", "var(--rep)", "Reproductive System", "الجهاز التناسلي",
          ["Non-venereal infections", "Neisseria gonorrhoeae", "Chlamydia trachomatis", "Lymphogranuloma venereum",
           "Pelvic inflammatory disease", "Syphilis", "Chancroid", "Donovanosis"],
          TWO, "REP 301 · Midterm topics")
