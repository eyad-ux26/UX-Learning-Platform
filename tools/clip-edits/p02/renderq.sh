#!/bin/bash
# Render P02 clips one after another, then make the preview encode (under 20 MiB) in out/web/.
cd /c/Users/eyadm/uxgate-web/heu/remotion
mkdir -p out/web
for id in "$@"; do
  if [ ! -f out/P02-$id.mp4 ]; then
    npx remotion render P02-$id out/P02-$id.mp4 --crf=20 --concurrency=3 > ../render_$id.log 2>&1 || { echo "FAIL $id"; continue; }
  fi
  ffmpeg -v error -y -i out/P02-$id.mp4 -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 96k -ac 1 -movflags +faststart out/web/P02-$id.mp4
  echo "done $id $(du -h out/web/P02-$id.mp4 | cut -f1)"
done
echo QUEUE DONE
