# MedAtlas Egypt — brand kit (v1.0, for review)

Nothing in this folder is wired into the website yet. Once the identity is approved, the next step is to apply it to the site (logo, favicon/app icons, colours and fonts).

| Folder | What's inside |
| --- | --- |
| `logo/svg`, `logo/png` | Horizontal, stacked, wordmark and symbol versions, each in **color** (light backgrounds), **reversed** (dark), **mono-black** and **mono-white**. Also app-icon tiles and the `micro301-beta` product badge. Text is outlined, so the SVGs need no fonts. PNGs are transparent. |
| `icons` | `icon-512/192.png`, `apple-icon-180.png`, `icon-maskable-512.png`, `favicon.ico` (16/32/48), `favicon-16/32/48.png`, plus SVG sources (`favicon-small.svg` is the heavier cut for 16–32 px). |
| `tokens.css` | Colour, font and texture tokens (Agar grid, lens ring, chips). |
| `fonts` | Sora, Inter, IBM Plex Sans Arabic, IBM Plex Mono (Google Fonts, OFL). |
| `guidelines` | One-page brand guidelines: `MedAtlas-Brand-Guidelines.pdf` / `.png`, with the editable `.html` source. |
| `social` | Editable HTML templates with PNG exports: Instagram post ×2 (1080²), Instagram story (1080×1920), Facebook post / OG image (1200×630), Facebook cover (1640×624). Phone mockups use real captures of the live site. |
| `video` | `medatlas-ad-15s-9x16.mp4`: 15 s Instagram Reel, 1080×1920, 30 fps, H.264/AAC, with Egyptian-Arabic synthetic voiceover and original synthesized music. `reel-cover.png` is the Reel cover. `ad.html` is the animation source. |

## Regenerating

Requirements: Chrome, ffmpeg, Node with `puppeteer-core`, Python with `fonttools numpy scipy edge-tts`.

```bash
FONT_DIR=brand/fonts python3 brand/_source/build_logos.py   # logo + icon SVGs
NODE_PATH=<puppeteer dir> node brand/_source/export_assets.js  # PNGs, icons, social exports
brand/video/_source/build_audio.sh /tmp/medatlas-audio         # voiceover + music (VOICE=ar-EG-SalmaNeural for a female voice)
NODE_PATH=<puppeteer dir> node brand/video/_source/render_video.js /tmp/medatlas-audio
```

To change the ad copy, edit the on-screen text in `video/ad.html` and the spoken lines in `video/_source/build_audio.sh`. Scene timings live in `S` (ad.html) and `VO_AT` (render_video.js). Preview live by opening `video/ad.html?play` in a browser.
