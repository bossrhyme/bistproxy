#!/bin/bash
# DeepFin cache-bust script
# Her deploy öncesi çalıştır: bash scripts/cache-bust.sh

HASH=$(git rev-parse --short HEAD)
echo "Cache-busting with hash: $HASH"

# index.html
sed -i "s|deepfin\.css?v=[^&\"']*|deepfin.css?v=$HASH|g" public/index.html
sed -i "s|deepfin\.js?v=[^&\"']*|deepfin.js?v=$HASH|g" public/index.html

# analiz pages (eğer varsa)
for f in public/analiz/*.html; do
  [ -f "$f" ] && sed -i "s|analiz\.css?v=[^&\"']*|analiz.css?v=$HASH|g" "$f"
  [ -f "$f" ] && sed -i "s|analiz\.js?v=[^&\"']*|analiz.js?v=$HASH|g" "$f"
  [ -f "$f" ] && sed -i "s|prf\.css?v=[^&\"']*|prf.css?v=$HASH|g" "$f"
  [ -f "$f" ] && sed -i "s|prf\.js?v=[^&\"']*|prf.js?v=$HASH|g" "$f"
done

echo "Done: ?v=$HASH"
