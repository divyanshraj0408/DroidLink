# Setup guide

Source: <https://github.com/divyanshraj0408/DroidLink>

From nothing to a paired phone and Mac in about 15 minutes, most of it downloads. There are two ways:
let an AI agent do it, or paste four blocks yourself.

## Let an AI agent do it

If you use an AI coding agent that can run terminal commands (Claude Code, Cursor, Codex, etc.),
open it in any folder and paste this. It clones the repo itself.

```text
Set up DroidLink (https://github.com/divyanshraj0408/DroidLink) on this Mac and my Android phone.
Work through it step by step:

1. If this folder isn't already the DroidLink repo, clone
   https://github.com/divyanshraj0408/DroidLink.git into ~/DroidLink and work there. SETUP.md in
   the repo is the reference for every step below.
2. Check the prerequisites: macOS 14+, Xcode Command Line Tools, Homebrew, a JDK between 17 and 25,
   the Android SDK, and adb. Report what is installed and what is missing. Ask me before you
   install anything, and prefer Homebrew or Android Studio's bundled tools.
3. Build the Mac app with mac/build.sh and open mac/build/DroidLink.app.
4. Create android/local.properties pointing at my Android SDK if it doesn't exist, set JAVA_HOME
   for the build, and run ./gradlew assembleDebug test in android/.
5. Check `adb devices`. If no phone shows up, tell me how to turn on USB debugging and wait
   until I've plugged it in and accepted the prompt. Then install the APK with adb install -r.
6. Walk me through pairing (scanning the QR code, granting the SMS, phone, contacts and
   notification permissions on the phone, and the Mac's notification and Local Network prompts).
   I have to do those taps myself, so tell me exactly what to tap and wait for me to confirm.
7. Ask whether I want camera and screen mirroring. If yes, install scrcpy with Homebrew.

Rules: don't change source code to get past an error. Show me the exact error and suggest a fix.
Never print, copy, or upload the contents of ~/Library/Application Support/DroidLink/key or the
pairing QR code. When you're done, tell me how to check that it works: a test SMS with a code
should land on the Mac clipboard.
```

The agent can install, build and copy everything over. You still scan the QR code and tap the
permission prompts on both devices yourself.

## What you need

| | Requirement |
|---|---|
| Mac | macOS 14 (Sonoma) or newer |
| Phone | Android 14 or newer, and a USB cable for the first install |
| Both | On the same Wi-Fi network |

Everything else is installed in step 1.

## 1. Install the tools (once)

```sh
xcode-select --install          # git, Swift and the Mac build tools; skip if already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"   # Homebrew, if you don't have it
brew install --cask android-studio
```

Open **Android Studio** once and click through its setup wizard with the standard options. That
downloads the Android SDK and adb to `~/Library/Android/sdk`. You don't need to open a project.

## 2. Turn on USB debugging on the phone

1. Settings → About phone → tap **Build number** seven times until it says you're a developer.
2. Settings → System → Developer options → turn on **USB debugging**.
3. Plug the phone into the Mac and tap **Allow** on the "Allow USB debugging?" prompt.

## 3. Download, build and install

Paste this whole block into Terminal:

```sh
git clone https://github.com/divyanshraj0408/DroidLink.git ~/DroidLink && cd ~/DroidLink

# Mac app → menu bar
mac/build.sh && open mac/build/DroidLink.app

# Phone app → over USB
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
(cd android && ./gradlew assembleDebug)
~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The first Gradle build downloads a few hundred MB, so give it a few minutes.

On the Mac, DroidLink appears in the menu bar (no Dock icon) and shows a pairing QR code. When macOS
asks, allow **Local Network** access and **Notifications**. If the app is blocked as being from an
unidentified developer, go to System Settings → Privacy & Security and click **Open Anyway**.

Optional: move `mac/build/DroidLink.app` to `/Applications` and add it under System Settings → General →
Login Items so it starts at login.

To update later: `cd ~/DroidLink && git pull`, then run the block again from `mac/build.sh` on.

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
