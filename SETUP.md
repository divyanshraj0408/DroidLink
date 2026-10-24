# Setup guide

From a fresh clone to a paired phone and Mac. Takes about 15 minutes, most of it downloads.

## Let an AI agent do it

If you use an AI coding agent that can run terminal commands (Claude Code, Cursor, Codex, etc.),
clone the repo, open the agent in the `droidlink` folder, and paste this:

```text
Set up DroidLink on this Mac by following SETUP.md in this repo. Work through it step by step:

1. Check the prerequisites first: macOS 14+, Xcode Command Line Tools, a JDK between 17 and 25,
   the Android SDK, and adb. Report what is installed and what is missing. Ask me before you
   install anything, and prefer Homebrew or Android Studio's bundled tools.
2. Build the Mac app with mac/build.sh and open mac/build/DroidLink.app.
3. Create android/local.properties pointing at my Android SDK if it doesn't exist, set JAVA_HOME
   for the build, and run ./gradlew assembleDebug test in android/.
4. Check `adb devices`. If no phone shows up, tell me how to turn on USB debugging and wait
   until I've plugged it in and accepted the prompt. Then install the APK with adb install -r.
5. Walk me through pairing (scanning the QR code, granting the SMS, phone, contacts and
   notification permissions on the phone, and the Mac's notification and Local Network prompts).
   I have to do those taps myself, so tell me exactly what to tap and wait for me to confirm.
6. Ask whether I want camera and screen mirroring. If yes, install scrcpy with Homebrew.

Rules: don't change source code to get past an error. Show me the exact error and suggest a fix.
Never print, copy, or upload the contents of ~/Library/Application Support/DroidLink/key or the
pairing QR code. When you're done, tell me how to check that it works: a test SMS with a code
should land on the Mac clipboard.
```

The agent can build and install everything. You still have to scan the QR code and tap the
permission prompts on both devices yourself.

## What you need

| | Requirement |
|---|---|
| Mac | macOS 14 (Sonoma) or newer, Xcode Command Line Tools (`xcode-select --install`) |
| Phone | Android 14 or newer, a USB cable for the first install |
| Both | On the same Wi-Fi network |
| Android build | JDK 17–25 and the Android SDK (easiest: install [Android Studio](https://developer.android.com/studio)) |
| Optional | [Homebrew](https://brew.sh) + `brew install scrcpy` for Phone Camera / Mirror Phone Screen |

## 1. Get the code

```sh
git clone https://github.com/<you>/droidlink.git
cd droidlink
```

## 2. Build and open the Mac app

```sh
mac/build.sh
open mac/build/DroidLink.app
```

The app is ad-hoc signed, so the first launch may be blocked. If macOS says it can't verify the
developer, go to System Settings → Privacy & Security and click **Open Anyway**.

DroidLink lives in the menu bar (no Dock icon). On first run it creates its encryption key in
`~/Library/Application Support/DroidLink/key` and shows a pairing QR code.

When macOS asks, allow **Local Network** access and **Notifications**. If you missed the prompts:
System Settings → Privacy & Security → Local Network, and System Settings → Notifications → DroidLink.

Optional: add `DroidLink.app` under System Settings → General → Login Items to start it at login.
Move it to `/Applications` first if you want it to survive a `git clean`.

## 3. Build and install the Android app

Tell Gradle where the SDK is. Android Studio does this for you when you open the `android/` folder;
otherwise create `android/local.properties`:

```properties
sdk.dir=/Users/<you>/Library/Android/sdk
```

Make sure `JAVA_HOME` points at JDK 17–25. Android Studio's bundled JDK works:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

Enable USB debugging on the phone (Settings → About phone → tap **Build number** 7 times, then
Settings → System → Developer options → **USB debugging**), plug it in, and run:

```sh
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`adb` is in `~/Library/Android/sdk/platform-tools/` if it isn't on your `PATH`.

## 4. Pair

1. On the phone, open **DroidLink** → **Pair with a Mac** and scan the QR code on the Mac
   (menu bar icon → **Pair Phone…** if the window is gone).
2. Allow the permissions Android asks for: SMS, phone/calls, contacts and notifications. Each one
   drives a feature, so you can skip any you don't want:

   | Permission | Used for |
   |---|---|
   | SMS (receive) | OTP autofill |
   | SMS (read, send) | Messages window on the Mac |
   | Phone, call log | Incoming call card, Accept / Decline / End, Keypad dialing |
   | Contacts | Showing names instead of numbers |
   | Notifications + notification access | Mirroring notifications and replying from Mac banners |

3. Make sure every row under **On your Mac** says **On** (tap a row to grant what's missing), then turn on
   **Run in Background** and tap **Add Quick Settings Tile**.

The menu bar menu should now say **Connected to …**. To check it works, send yourself an SMS containing a
code and see it land on the Mac clipboard, then open Menu → **Messages…** and call the phone from another phone.

## 5. Camera and screen mirroring (optional)

```sh
brew install scrcpy
```

Plug the phone in by USB once and pick **Phone Camera** or **Mirror Phone Screen** from the menu.
DroidLink switches adb to Wi-Fi, so you can unplug afterwards. Repeat the USB step after each phone restart.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Phone never connects | Same Wi-Fi? Check Local Network permission for DroidLink on the Mac. Guest networks and some routers block device-to-device traffic. |
| Connects, then stops after the Mac's IP changes | The phone finds the Mac again via Bonjour or a /24 subnet scan; give it a minute. Re-pair if it doesn't. |
| No Wi-Fi between them at all | Use USB: `adb reverse tcp:47821 tcp:47821`, then pair with host `127.0.0.1`. |
| Phone drops off after a while | Turn on **Run in Background** in the app, and exclude DroidLink from any vendor battery saver. |
| No Mac banners | System Settings → Notifications → DroidLink → allow. |
| A row in the app says Off | Tap it to grant the permission. If Android stops asking, grant it in Settings → Apps → DroidLink → Permissions. |
| Call card doesn't appear | Phone and call log permissions must be allowed on the phone, and the **Calls** row in the app must say On. |
| "scrcpy not found" | `brew install scrcpy` |
| "Plug the phone in once" | Connect by USB with USB debugging on, accept the prompt on the phone, retry. |
| Want a new key | Quit DroidLink, delete `~/Library/Application Support/DroidLink/key`, reopen, and re-pair the phone. |

## Security notes

- All traffic stays on your LAN and is encrypted with AES-256-GCM.
- The 256-bit key is generated on the Mac and only leaves it inside the pairing QR code. Don't share
  screenshots of that code; anyone who scans it can read and send messages as your phone.
- The Mac port (47821) accepts connections from the network but drops anything that doesn't decrypt
  with your key.
