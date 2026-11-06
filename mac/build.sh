#!/bin/sh
# Builds DroidLink.app (ad-hoc signed, Apple silicon + Intel) into ./build, with the Share menu
# extension inside.
set -e
cd "$(dirname "$0")"
APP=build/DroidLink.app
EXT="$APP/Contents/PlugIns/DroidLinkShare.appex"
TMP=$(mktemp -d)

# Both architectures build into the same folder, so each is copied out before the next.
for arch in arm64 x86_64; do
    swift build -c release --triple "$arch-apple-macosx14.0"
    cp "$(swift build -c release --triple "$arch-apple-macosx14.0" --show-bin-path)/DroidLink" "$TMP/DroidLink-$arch"
    # Share extension: app extensions start in NSExtensionMain, not a Swift main.
    swiftc -O -parse-as-library -module-name DroidLinkShare -target "$arch-apple-macos14.0" \
        -Xlinker -e -Xlinker _NSExtensionMain -framework AppKit \
        ShareExtension/ShareViewController.swift -o "$TMP/DroidLinkShare-$arch"
done

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$EXT/Contents/MacOS"
lipo -create "$TMP/DroidLink-arm64" "$TMP/DroidLink-x86_64" -output "$APP/Contents/MacOS/DroidLink"
lipo -create "$TMP/DroidLinkShare-arm64" "$TMP/DroidLinkShare-x86_64" -output "$EXT/Contents/MacOS/DroidLinkShare"
rm -rf "$TMP"
cp AppIcon.icns "$APP/Contents/Resources/"
cp Info.plist "$APP/Contents/"
cp ShareExtension/Info.plist "$EXT/Contents/"

# Inside out: the extension first, then the app that contains it.
codesign --force -s - --entitlements ShareExtension/Share.entitlements "$EXT"
codesign --force -s - "$APP"
pluginkit -a "$EXT" 2>/dev/null || true
echo "$PWD/$APP"
