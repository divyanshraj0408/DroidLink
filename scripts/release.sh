#!/bin/sh
# Builds the downloads for a GitHub release into dist/: DroidLink.dmg (drag to Applications) and
# DroidLink.apk (signed with the release key in android/keystore.properties).
set -e
cd "$(dirname "$0")/.."
rm -rf dist
mkdir dist

mac/build.sh
STAGE=$(mktemp -d)
ditto mac/build/DroidLink.app "$STAGE/DroidLink.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname DroidLink -srcfolder "$STAGE" -fs HFS+ -format UDZO dist/DroidLink.dmg -quiet
rm -rf "$STAGE"

[ -f android/keystore.properties ] || echo "warning: no android/keystore.properties, so the APK is signed with the debug key" >&2
(cd android && ./gradlew -q assembleRelease)
cp android/app/build/outputs/apk/release/app-release.apk dist/DroidLink.apk

cd dist && shasum -a 256 DroidLink.dmg DroidLink.apk | tee SHA256SUMS.txt
