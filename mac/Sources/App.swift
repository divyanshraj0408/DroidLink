import AppKit
import CoreImage.CIFilterBuiltins
import CryptoKit
import SwiftUI
import UserNotifications

@main
final class App: NSObject, NSApplicationDelegate, NSMenuDelegate, UNUserNotificationCenterDelegate {
    static let shared = App()

    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        app.delegate = shared
        app.run()
    }

    let support = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/DroidLink")
    let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    let pasteboard = NSPasteboard.general
    var freshKey = false
    lazy var key = loadKey()
    lazy var link = Link(key: key)
    var lastChange = 0
    var phone: String?
    var lastOTP: String?
    var recent: [(id: String, line: String, text: String)] = []
    var pairWindow: NSWindow?
    var messagesWindow: NSWindow?
    lazy var messages = Messages { [weak self] in self?.link.send($0) }
    lazy var calls = Calls { [weak self] in self?.link.send($0) }
    var keypadWindow: NSWindow?
    var notificationsOff = false

    func applicationDidFinishLaunching(_ n: Notification) {
        item.button?.image = Glyph.menuBarImage()
        item.button?.appearsDisabled = true
        calls.contacts = { [weak self] in self?.messages.contacts ?? [] }
        messages.onCall = { [weak self] in self?.calls.dial($0) }
        item.menu = NSMenu()
        item.menu?.delegate = self

        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound]) { ok, err in
            DispatchQueue.main.async { self.notificationsOff = !ok }
        }
        let reply = UNTextInputNotificationAction(identifier: "reply", title: "Reply", options: [],
                                                  textInputButtonTitle: "Send", textInputPlaceholder: "Message")
        center.setNotificationCategories([UNNotificationCategory(identifier: "reply", actions: [reply], intentIdentifiers: [])])

        link.onState = { [weak self] up in
            guard let self else { return }
            if !up { phone = nil }
            item.button?.appearsDisabled = !up
            messages.connected = up
            if !up { calls.disconnected() }
            if up, messagesWindow?.isVisible == true { messages.refresh(); messages.loadContacts() }
        }
        link.onMessage = { [weak self] m in self?.handle(m) }
        do { try link.start() } catch { notify("DroidLink can't listen on port \(Link.port)", "\(error)") }

        lastChange = pasteboard.changeCount
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.watchClipboard() }

        if freshKey { showPair() }
    }

    // MARK: Phone messages

    func handle(_ m: [String: Any]) {
        let s = { (k: String) in m[k] as? String ?? "" }
        switch s("t") {
        case "hello":
            phone = s("name")
            calls.device = s("name")
            messages.loadContacts() // the keypad suggests contacts too
        case "call", "call_error":
            calls.handle(m)
        case "ping":
            link.send(["t": "pong"])
        case "notif":
            let line = [s("app"), s("title")].filter { !$0.isEmpty }.joined(separator: " · ")
            recent.removeAll { $0.id == s("id") }
            recent.insert((s("id"), line, s("text")), at: 0)
            recent = Array(recent.prefix(10))
            notify(line, s("text"), id: s("id"), replyable: m["reply"] as? Bool ?? false)
        case "notif_rm":
            recent.removeAll { $0.id == s("id") }
            UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [s("id")])
        case "otp":
            lastOTP = s("code")
            copy(s("code"))
            notify("OTP \(s("code")) copied", s("text"), sound: true)
        case "clip":
            copy(s("text"))
        case "sms_threads", "sms_thread", "contacts", "sms_sent":
            messages.handle(m)
        case "sms_changed":
            if messagesWindow?.isVisible == true { messages.handle(m) }
        case "file":
            guard let data = Data(base64Encoded: s("data")) else { return }
            let url = downloadURL(s("name"))
            do {
                try data.write(to: url)
                notify("Received \(url.lastPathComponent)", "Saved to Downloads", path: url.path)
            } catch {
                notify("Couldn't save \(url.lastPathComponent)", "\(error)")
            }
        default:
            break
        }
    }

    // MARK: Clipboard

    func copy(_ text: String) {
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        lastChange = pasteboard.changeCount
    }

    func watchClipboard() {
        guard pasteboard.changeCount != lastChange else { return }
        lastChange = pasteboard.changeCount
        // Password managers mark their copies (nspasteboard.org); never send those.
        let types = pasteboard.types ?? []
        guard !types.contains(.init("org.nspasteboard.ConcealedType")),
              !types.contains(.init("org.nspasteboard.TransientType")),
              let text = pasteboard.string(forType: .string), text.utf8.count < 1 << 20 else { return }
        link.send(["t": "clip", "text": text])
    }

    // MARK: Menu

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        menu.addItem(withTitle: phone.map { "Connected to \($0)" } ?? "Phone not connected", action: nil, keyEquivalent: "")
        if notificationsOff {
            add(menu, "⚠︎ Turn On Mac Notifications…") {
                NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=dev.droidlink.mac")!)
            }
        }
        if let otp = lastOTP {
            add(menu, "Copy Last OTP: \(otp)") { [weak self] in self?.copy(otp) }
        }
        if !recent.isEmpty {
            menu.addItem(.separator())
            for r in recent {
                add(menu, String("\(r.line) — \(r.text)".prefix(70))) { [weak self] in self?.copy(r.text) }
            }
        }
        menu.addItem(.separator())
        add(menu, "Messages…") { [weak self] in self?.showMessages() }
        add(menu, "Keypad…") { [weak self] in self?.showKeypad() }
        add(menu, "Send File to Phone…") { [weak self] in self?.sendFile() }
        add(menu, "Phone Camera") { [weak self] in self?.scrcpy(["--video-source=camera", "--camera-facing=back", "--max-size=1920", "--no-audio"]) }
        add(menu, "Mirror Phone Screen") { [weak self] in self?.scrcpy([]) }
        menu.addItem(.separator())
        add(menu, "Pair Phone…") { [weak self] in self?.showPair() }
        add(menu, "Quit DroidLink") { NSApp.terminate(nil) }
    }

    func add(_ menu: NSMenu, _ title: String, _ run: @escaping () -> Void) {
        let action = MenuAction(run)
        let i = NSMenuItem(title: title, action: #selector(MenuAction.fire), keyEquivalent: "")
        i.target = action
        i.representedObject = action // menu items hold their target weakly
        menu.addItem(i)
    }

    func showMessages() {
        let w = messagesWindow ?? {
            let w = NSWindow(contentViewController: NSHostingController(rootView: MessagesView(model: messages)))
            w.title = "Messages"
            w.styleMask.insert(.fullSizeContentView)
            w.setContentSize(NSSize(width: 860, height: 600))
            w.contentMinSize = NSSize(width: 600, height: 400)
            w.isReleasedWhenClosed = false
            w.setFrameAutosaveName("Messages")
            w.center()
            return w
        }()
        messagesWindow = w
        messages.connected = link.isConnected
        NSApp.activate()
        w.makeKeyAndOrderFront(nil)
        messages.refresh()
        messages.loadContacts()
    }

    func showKeypad() {
        let w = keypadWindow ?? {
            let w = NSWindow(contentViewController: NSHostingController(rootView: KeypadView(calls: calls)))
            w.styleMask = [.titled, .closable, .fullSizeContentView]
            w.titlebarAppearsTransparent = true
            w.titleVisibility = .hidden
            w.isReleasedWhenClosed = false
            w.center()
            return w
        }()
        keypadWindow = w
        NSApp.activate()
        w.makeKeyAndOrderFront(nil)
    }

    func sendFile() {
        guard link.isConnected else { return notify("Phone not connected", "Open DroidLink on your phone.") }
        let panel = NSOpenPanel()
        NSApp.activate()
        guard panel.runModal() == .OK, let url = panel.url, let data = try? Data(contentsOf: url) else { return }
        guard data.count <= Link.maxFile else { return notify("File too big", "The limit is 50 MB.") }
        link.send(["t": "file", "name": url.lastPathComponent, "data": data.base64EncodedString()])
    }

    /// Android Studio's SDK first, then Homebrew's (installed alongside scrcpy).
    let adbPath = [FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Android/sdk/platform-tools/adb").path,
                   "/opt/homebrew/bin/adb", "/usr/local/bin/adb"].first(where: FileManager.default.isExecutableFile)
        ?? "/opt/homebrew/bin/adb"

    /// Camera and screen mirroring go through scrcpy, which needs adb. Prefers adb over Wi-Fi.
    func scrcpy(_ args: [String]) {
        guard let bin = ["/opt/homebrew/bin/scrcpy", "/usr/local/bin/scrcpy"].first(where: FileManager.default.isExecutableFile)
        else { return notify("scrcpy not found", "Run: brew install scrcpy") }
        let ip = link.peerHost
        DispatchQueue.global().async {
            let target = self.adbTarget(ip)
            DispatchQueue.main.async {
                guard let target else {
                    return self.notify("Plug the phone in once", "Connect it by USB with USB debugging on, then try again. After that it works over Wi-Fi until the phone restarts.")
                }
                self.launchScrcpy(bin, target + args)
            }
        }
    }

    /// scrcpy device args: Wi-Fi when adb-over-TCP is on (switching it on through USB if needed), else USB.
    func adbTarget(_ ip: String?) -> [String]? {
        let usb = adb(["-d", "get-state"]).hasPrefix("device")
        if let ip {
            let wifi = "\(ip):5555"
            // "connected to" / "already connected to"; failures say "failed to connect" or "cannot connect".
            if adb(["connect", wifi]).contains("connected to") { return ["-s", wifi] }
            if usb {
                _ = adb(["-d", "tcpip", "5555"])
                Thread.sleep(forTimeInterval: 2)
                if adb(["connect", wifi]).contains("connected to") { return ["-s", wifi] }
            }
        }
        return usb ? ["-d"] : nil
    }

    func adb(_ args: [String]) -> String {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: adbPath)
        p.arguments = args
        let out = Pipe()
        p.standardOutput = out
        p.standardError = out
        guard (try? p.run()) != nil else { return "" }
        let data = out.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        return String(decoding: data, as: UTF8.self)
    }

    func launchScrcpy(_ bin: String, _ args: [String]) {
        let log = support.appendingPathComponent("scrcpy.log")
        FileManager.default.createFile(atPath: log.path, contents: nil)
        let p = Process()
        p.executableURL = URL(fileURLWithPath: bin)
        p.arguments = args
        p.environment = ProcessInfo.processInfo.environment.merging(["ADB": adbPath]) { $1 }
        p.standardOutput = try? FileHandle(forWritingTo: log)
        p.standardError = p.standardOutput
        p.terminationHandler = { [weak self] p in
            guard p.terminationStatus != 0 else { return }
            let tail = ((try? String(contentsOf: log, encoding: .utf8)) ?? "").split(separator: "\n").suffix(2).joined(separator: "\n")
            DispatchQueue.main.async { self?.notify("scrcpy stopped", tail.isEmpty ? "Is the phone plugged in with USB debugging on?" : tail) }
        }
        do { try p.run() } catch { notify("Couldn't start scrcpy", "\(error)") }
    }

    // MARK: Pairing

    var keyURL: URL { support.appendingPathComponent("key") }

    func loadKey() -> SymmetricKey {
        if let d = try? Data(contentsOf: keyURL), d.count == 32 { return SymmetricKey(data: d) }
        let k = SymmetricKey(size: .bits256)
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        FileManager.default.createFile(atPath: keyURL.path, contents: k.withUnsafeBytes { Data($0) },
                                       attributes: [.posixPermissions: 0o600])
        freshKey = true
        return k
    }

    func showPair() {
        let ip = localIP() ?? "unknown"
        let payload = "droidlink:" + key.withUnsafeBytes { Data($0) }.base64EncodedString() + "@" + ip
        let qr = CIFilter.qrCodeGenerator()
        qr.message = Data(payload.utf8)
        guard let ci = qr.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)) else { return }
        let rep = NSCIImageRep(ciImage: ci)
        let image = NSImage(size: rep.size)
        image.addRepresentation(rep)

        let label = NSTextField(wrappingLabelWithString: "On your phone open DroidLink → Pair with Mac, then scan this code.\nThis Mac: \(ip)")
        label.preferredMaxLayoutWidth = rep.size.width
        let stack = NSStackView(views: [NSImageView(image: image), label])
        stack.orientation = .vertical
        stack.edgeInsets = NSEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)

        let w = pairWindow ?? NSWindow(contentRect: .zero, styleMask: [.titled, .closable], backing: .buffered, defer: false)
        w.title = "Pair Phone"
        w.isReleasedWhenClosed = false
        w.contentView = stack
        w.setContentSize(stack.fittingSize)
        w.center()
        pairWindow = w
        NSApp.activate()
        w.makeKeyAndOrderFront(nil)
    }

    func localIP() -> String? {
        var ifs: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifs) == 0, let first = ifs else { return nil }
        defer { freeifaddrs(ifs) }
        for p in sequence(first: first, next: { $0.pointee.ifa_next }) {
            guard let addr = p.pointee.ifa_addr, addr.pointee.sa_family == UInt8(AF_INET),
                  String(cString: p.pointee.ifa_name).hasPrefix("en") else { continue }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            guard getnameinfo(addr, socklen_t(addr.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 else { continue }
            return String(cString: host)
        }
        return nil
    }

    // MARK: Notifications

    func notify(_ title: String, _ body: String, id: String = UUID().uuidString, replyable: Bool = false,
                path: String? = nil, sound: Bool = false) {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        if replyable { c.categoryIdentifier = "reply" }
        if sound { c.sound = .default }
        c.userInfo = ["id": id, "path": path ?? ""]
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: nil))
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent n: UNNotification,
                                withCompletionHandler done: @escaping (UNNotificationPresentationOptions) -> Void) {
        done([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive r: UNNotificationResponse,
                                withCompletionHandler done: @escaping () -> Void) {
        let info = r.notification.request.content.userInfo
        let text = (r as? UNTextInputNotificationResponse)?.userText
        DispatchQueue.main.async {
            if let text, let id = info["id"] as? String {
                self.link.send(["t": "reply", "id": id, "text": text])
            } else if let path = info["path"] as? String, !path.isEmpty {
                NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)])
            }
        }
        done()
    }

    func downloadURL(_ name: String) -> URL {
        let dir = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        var safe = (name as NSString).lastPathComponent
        if safe.isEmpty || safe == "." || safe == ".." { safe = "file" }
        var url = dir.appendingPathComponent(safe)
        var n = 1
        while FileManager.default.fileExists(atPath: url.path) {
            n += 1
            url = dir.appendingPathComponent("\(n)-\(safe)")
        }
        return url
    }
}

final class MenuAction: NSObject {
    let run: () -> Void
    init(_ run: @escaping () -> Void) { self.run = run }
    @objc func fire() { run() }
}
