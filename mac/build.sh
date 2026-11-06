#!/bin/sh
# Builds DroidLink.app (ad-hoc signed) into ./build, with the Share menu extension inside.
set -e
cd "$(dirname "$0")"
swift build -c release
APP=build/DroidLink.app
EXT="$APP/Contents/PlugIns/DroidLinkShare.appex"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$EXT/Contents/MacOS"
cp .build/release/DroidLink "$APP/Contents/MacOS/"
cp AppIcon.icns "$APP/Contents/Resources/"
cp Info.plist "$APP/Contents/"

# Share extension: app extensions start in NSExtensionMain, not a Swift main.
swiftc -O -parse-as-library -module-name DroidLinkShare -target "$(uname -m)-apple-macos14.0" \
    -Xlinker -e -Xlinker _NSExtensionMain -framework AppKit \
    ShareExtension/ShareViewController.swift -o "$EXT/Contents/MacOS/DroidLinkShare"
cp ShareExtension/Info.plist "$EXT/Contents/"

# Inside out: the extension first, then the app that contains it.
codesign --force -s - --entitlements ShareExtension/Share.entitlements "$EXT"
codesign --force -s - "$APP"
pluginkit -a "$EXT" 2>/dev/null || true
echo "$PWD/$APP"
