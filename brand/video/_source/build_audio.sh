#!/usr/bin/env bash
# Builds the voiceover clips + music bed into $1 (default /tmp/medatlas-audio).
# Needs: pip install edge-tts numpy scipy ; ffmpeg
set -euo pipefail
OUT="${1:-/tmp/medatlas-audio}"
DIR="$(cd "$(dirname "$0")" && pwd)"
VOICE="${VOICE:-ar-EG-ShakirNeural}"   # alt: ar-EG-SalmaNeural (female)
mkdir -p "$OUT"

# English terms are spelled in Arabic script so the Egyptian voice pronounces them the way students say them.
LINES=(
  "امتحان المايكرو قرّب؟"
  "مع ميد أطلس، عندك إكزام باكدجز كاملة لكل موديول."
  "ودكتور أطلس، الإيه آي تيوتر بتاعك، يشرحلك ويمتحنك."
  "ذاكر بذكاء، مش بالساعات."
  "التسجيل مجاني دلوقتي!"
)
i=0
for line in "${LINES[@]}"; do
  i=$((i + 1))
  edge-tts --voice "$VOICE" --rate=+12% --text "$line" --write-media "$OUT/raw_$i.mp3"
  ffmpeg -v error -y -i "$OUT/raw_$i.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse" \
    -ar 48000 -ac 1 "$OUT/vo_$i.wav"
done
python3 "$DIR/music.py" "$OUT/music.wav" 15 12.9
echo "audio ready in $OUT"
