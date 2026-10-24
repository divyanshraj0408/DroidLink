#!/bin/sh
# Builds DroidLink.app (ad-hoc signed) into ./build.
set -e
cd "$(dirname "$0")"
swift build -c release
APP=build/DroidLink.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp .build/release/DroidLink "$APP/Contents/MacOS/"
cp AppIcon.icns "$APP/Contents/Resources/"
cp Info.plist "$APP/Contents/"
codesign --force -s - "$APP"
echo "$PWD/$APP"
