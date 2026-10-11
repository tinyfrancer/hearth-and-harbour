#!/bin/bash
# Every review image of the study, into OUT (default /home/claude/lane-shots/w13-study).
# Needs the dev server on PORT (npx vite --port 5191), Playwright outside the repo
# (PW, see shoot.mjs) and ffmpeg for the GIFs. Run from the repo root.
set -e
OUT=${OUT:-/home/claude/lane-shots/w13-study}
FR=${FRAMES:-/tmp/hh-study-frames}
mkdir -p "$OUT" "$FR"
S=study/title-and-icon
node $S/shoot.mjs "$OUT" \
  "title&o=A:title-A.png:390:844:3" \
  "title&o=B:title-B.png:390:844:3" \
  "title&o=C:title-C.png:390:844:3" \
  "title&o=D:title-D.png:390:844:3" \
  "compare:titles-compare.png:1760:1100:1" \
  "logotypes:logotypes.png:1700:900:2" \
  "icons:icons-compare.png:1360:900:1" \
  "home:icons-homescreen.png:1100:900:3" \
  "safe:icons-safezone.png:1500:900:1"
gif() {
  node $S/frames.mjs "$FR" "$1" "$2" 2
  ffmpeg -loglevel error -y -framerate "$3" -i "$FR/$1-%03d.png" -vf "palettegen=max_colors=256:stats_mode=full" "$FR/$1-pal.png"
  ffmpeg -loglevel error -y -framerate "$3" -i "$FR/$1-%03d.png" -i "$FR/$1-pal.png" -lavfi "paletteuse=dither=none" -loop 0 "$OUT/title-$1.gif"
}
# id, frames per loop, frames per second (the loop's length / frames)
gif A 40 10
gif B 24 10
gif C 36 6
gif D 36 10
ls -la "$OUT"
