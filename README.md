# DroidLink

Continuity-style link between an Android phone and a Mac: OTPs, notifications with replies,
clipboard both ways, files both ways, SMS, call control, phone camera and screen mirroring.

Everything stays on your local network. Messages are AES-256-GCM encrypted with a key that
only travels inside the pairing QR code.

## Build

Full walkthrough with prerequisites and troubleshooting: [SETUP.md](SETUP.md).

```sh
mac/build.sh                                  # → mac/build/DroidLink.app
mac/tools/icon/make.sh                        # only after changing the icon: rebuilds mac/AppIcon.icns
cd android && ./gradlew assembleDebug         # → app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Android builds need JDK 17–25 (`JAVA_HOME`). Camera and mirroring need `brew install scrcpy`.

## Set up

1. Open `DroidLink.app` on the Mac. A pairing QR code appears (later: menu bar icon → Pair Phone…).
2. On the phone, open DroidLink → **Pair with Mac**, scan the code, and allow SMS and notification permissions.
3. Tap **Allow notification access**, **Keep running in background** and **Add "Send clipboard" tile**.
4. On the Mac, allow DroidLink in System Settings → Notifications.

The phone and Mac must be on the same Wi-Fi. If the Mac's IP changes, the phone finds it again over
Bonjour, or by scanning its /24 subnet when the router drops multicast (JioFiber does). Allow DroidLink
under Privacy & Security → Local Network if macOS asks. Over USB instead: `adb reverse tcp:47821 tcp:47821`
and pair with host `127.0.0.1`.

## What does what

| Feature | How |
|---|---|
| OTPs | SMS arrives → code copied to the Mac clipboard + banner. Android 15+ hides OTPs from notification apps, so this reads SMS directly. |
| Notifications | Mirrored as Mac banners; type a reply in the banner for WhatsApp, Messages, etc. |
| Calls | Incoming calls show an iPhone-style card (top right) with Accept / Decline; End during a call. Dial from Menu → Keypad… or the phone button in a Messages conversation. Audio stays on the phone. |
| Messages | Menu → Messages…: SMS conversations with history, replies, and new messages (⌘N, contact suggestions). Plain SMS only; RCS chats live inside Google Messages, so reply to those from the banner. |
| Clipboard Mac → phone | Automatic. Password-manager copies are skipped. |
| Clipboard phone → Mac | Quick Settings tile, the app button, or Share → Send to Mac (Android blocks background clipboard reads). |
| Files | Phone: Share → Send to Mac (lands in ~/Downloads). Mac: menu → Send File to Phone… (lands in phone Downloads). 50 MB max. |
| Camera / mirror | Menu → Phone Camera / Mirror Phone Screen (scrcpy). Runs over Wi-Fi; after each phone restart, plug in USB once and DroidLink switches adb to Wi-Fi again. |

## Not done

- Call audio on the Mac (Android doesn't let apps carry call audio).
- Speaker and mute from the Mac. Android 16 ignores AudioManager for carrier calls, and the call-companion
  InCallService route (`telecom add-or-remove-call-companion-app`) didn't take effect on the Nothing 2a Plus.
- Photos in Messages (MMS). Viewing is doable; sending needs either a hand-off to Google Messages or a hand-built MMS PDU.
- Launch at login: add DroidLink.app under System Settings → General → Login Items.
