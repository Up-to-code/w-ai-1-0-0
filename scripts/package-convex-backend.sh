#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="$DIST_DIR/convex-backend-stage"
OUTPUT_ZIP="$DIST_DIR/convex-backend.zip"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR" "$DIST_DIR"

cp -R "$ROOT_DIR/convex" "$STAGE_DIR/convex"
cp "$ROOT_DIR/package.json" "$STAGE_DIR/package.json"

if [[ -f "$ROOT_DIR/convex.config.ts" ]]; then
  cp "$ROOT_DIR/convex.config.ts" "$STAGE_DIR/convex.config.ts"
fi

if [[ -f "$OUTPUT_ZIP" ]]; then
  rm -f "$OUTPUT_ZIP"
fi

(
  cd "$STAGE_DIR"
  zip -qr "$OUTPUT_ZIP" .
)

rm -rf "$STAGE_DIR"

echo "Created backend package: $OUTPUT_ZIP"
