"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { REPO, SETUP_GUIDE } from "@/lib/site"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Same text as the prompt in SETUP.md.
const AGENT_PROMPT = `Set up DroidLink (${REPO}) on this Mac and my Android phone.
Work through it step by step:

1. If this folder isn't already the DroidLink repo, clone
   ${REPO}.git into ~/DroidLink and work there. SETUP.md in
   the repo is the reference for every step below.
2. Check the prerequisites: macOS 14+, Xcode Command Line Tools, Homebrew, a JDK between 17 and 25,
   the Android SDK, and adb. Report what is installed and what is missing. Ask me before you
   install anything, and prefer Homebrew or Android Studio's bundled tools.
3. Build the Mac app with mac/build.sh and open mac/build/DroidLink.app.
4. Create android/local.properties pointing at my Android SDK if it doesn't exist, set JAVA_HOME
   for the build, and run ./gradlew assembleDebug test in android/.
5. Check \`adb devices\`. If no phone shows up, tell me how to turn on USB debugging and wait
   until I've plugged it in and accepted the prompt. Then install the APK with adb install -r.
6. Walk me through pairing (scanning the QR code, granting the SMS, phone, contacts and
   notification permissions on the phone, and the Mac's notification and Local Network prompts).
   I have to do those taps myself, so tell me exactly what to tap and wait for me to confirm.
7. Ask whether I want camera and screen mirroring. If yes, install scrcpy with Homebrew.

Rules: don't change source code to get past an error. Show me the exact error and suggest a fix.
Never print, copy, or upload the contents of ~/Library/Application Support/DroidLink/key or the
pairing QR code. When you're done, tell me how to check that it works: a test SMS with a code
should land on the Mac clipboard.`

// Same steps as SETUP.md.
const STEPS: { title: string; code?: string; note: string }[] = [
  {
    title: "Install the tools (once)",
    code: `xcode-select --install          # git, Swift and the Mac build tools
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"   # Homebrew, if you don't have it
brew install --cask android-studio`,
    note: "Then open Android Studio once and click through its setup wizard with the standard options. That downloads the Android SDK; you don't need to open a project. Skip anything you already have.",
  },
  {
    title: "Turn on USB debugging on the phone",
    note: "Settings → About phone → tap Build number seven times. Then Settings → System → Developer options → turn on USB debugging. Plug the phone into the Mac and tap Allow on the prompt.",
  },
  {
    title: "Download, build and install",
    code: `git clone ${REPO}.git ~/DroidLink && cd ~/DroidLink

# Mac app → menu bar
mac/build.sh && open mac/build/DroidLink.app

# Phone app → over USB
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
(cd android && ./gradlew assembleDebug)
~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk`,
    note: "Paste the whole block into Terminal. The first Android build downloads a few hundred MB. When macOS asks, allow Local Network access and Notifications for DroidLink.",
  },
  {
    title: "Pair",
    note: "The Mac shows a QR code. On the phone, open DroidLink, tap Pair with a Mac and scan it. Allow the permissions it asks for until every row under On your Mac says On, then turn on Run in Background.",
  },
  {
    title: "Check it works",
    code: "brew install scrcpy   # optional: phone camera and screen mirroring",
    note: "Text yourself a message with a code in it: the code should land on your Mac’s clipboard. To update later, run git pull in ~/DroidLink and paste step 3 again from mac/build.sh on.",
  },
]

export function Setup() {
  return (
    <Tabs defaultValue="hand" className="gap-6">
      <TabsList>
        <TabsTrigger value="hand">By hand</TabsTrigger>
        <TabsTrigger value="agent">With an AI agent</TabsTrigger>
      </TabsList>

      <TabsContent value="hand" className="min-w-0">
        <ol className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-y-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span className="font-heading text-2xl leading-7 text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="space-y-2.5">
                <h3 className="text-base leading-7 font-semibold">{s.title}</h3>
                {s.code && <Code text={s.code} />}
                <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
          Stuck? The <a href={SETUP_GUIDE} className="text-foreground underline underline-offset-4">setup guide on GitHub</a> has
          a troubleshooting table for connection, permission and build problems.
        </p>
      </TabsContent>

      <TabsContent value="agent" className="min-w-0 max-w-3xl space-y-3">
        <p className="max-w-[62ch] text-sm text-muted-foreground">
          Open Claude Code, Cursor or another agent that can run terminal commands, in any folder, and paste this. It clones the
          repo, checks what’s installed, builds and installs both apps. You still scan the QR code and tap the permission prompts
          yourself.
        </p>
        <Code text={AGENT_PROMPT} tall />
      </TabsContent>
    </Tabs>
  )
}

function Code({ text, tall }: { text: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative rounded-lg bg-graphite text-[#e6e7ea]">
      <pre className={`overflow-x-auto p-3.5 pr-12 font-mono text-[12.5px] leading-relaxed ${tall ? "max-h-[360px]" : ""}`}>
        <code>{text}</code>
      </pre>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={() => {
          navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-2 right-2 text-[#e6e7ea] hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
