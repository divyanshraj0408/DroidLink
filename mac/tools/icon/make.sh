#!/bin/sh
# Rebuilds mac/AppIcon.icns from the shared chain glyph.
set -e
cd "$(dirname "$0")/../.."
TMP=$(mktemp -d)
swiftc -O -o "$TMP/make-icon" Sources/Glyph.swift tools/icon/main.swift
"$TMP/make-icon" "$TMP/AppIcon.iconset"
iconutil -c icns "$TMP/AppIcon.iconset" -o AppIcon.icns
cp "$TMP/AppIcon.iconset/icon_512x512@2x.png" tools/icon/preview.png
rm -rf "$TMP"
echo "$PWD/AppIcon.icns"
