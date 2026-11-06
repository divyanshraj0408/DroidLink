import AppKit
import os
import UniformTypeIdentifiers

/// "DroidLink" in the macOS Share menu (Photos, Finder, Safari…). The extension is sandboxed: it has
/// no network link, and it may not launch DroidLink.app with files. So it copies the shared files into
/// its outbox and opens droidlink://outbox; the app (not sandboxed) sends what's there to the phone.
@objc(ShareViewController)
final class ShareViewController: NSViewController {
    /// Read by App.swift too: ~/Library/Containers/dev.droidlink.mac.share/Data/Library/Caches/Outbox
    static let outbox = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("Outbox")
    private let log = Logger(subsystem: "dev.droidlink.mac.share", category: "share")

    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 1, height: 1))
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        // One folder per item, so two items with the same name don't collide.
        let share = Self.outbox.appendingPathComponent(UUID().uuidString)
        let group = DispatchGroup()
        var copied = 0
        let lock = NSLock()
        for (i, p) in providers.enumerated() {
            group.enter()
            let dir = share.appendingPathComponent("\(i)")
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            load(p, into: dir) { ok in
                if ok { lock.lock(); copied += 1; lock.unlock() }
                group.leave()
            }
        }
        group.notify(queue: .main) { [self] in
            log.info("copied \(copied) of \(providers.count)")
            if copied > 0 { NSWorkspace.shared.open(URL(string: "droidlink://outbox")!) }
            extensionContext?.completeRequest(returningItems: nil)
        }
    }

    /// Photos and Finder hand over the original file's URL (with sandbox access to it); copying that
    /// keeps the real name. Anything without one (e.g. an image dragged from Safari) comes as data.
    private func load(_ p: NSItemProvider, into dir: URL, done: @escaping (Bool) -> Void) {
        if p.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
            p.loadItem(forTypeIdentifier: UTType.fileURL.identifier) { [log] item, error in
                let url = (item as? URL) ?? (item as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) }
                guard let url else { log.error("file url: \(String(describing: error), privacy: .public)"); return done(false) }
                do {
                    try FileManager.default.copyItem(at: url, to: dir.appendingPathComponent(url.lastPathComponent))
                    done(true)
                } catch {
                    log.error("copy: \(error, privacy: .public)")
                    done(false)
                }
            }
            return
        }
        guard let type = p.registeredTypeIdentifiers.first(where: { UTType($0)?.conforms(to: .data) == true }) else { return done(false) }
        p.loadDataRepresentation(forTypeIdentifier: type) { [log] data, error in
            guard let data else { log.error("data: \(String(describing: error), privacy: .public)"); return done(false) }
            let ext = UTType(type)?.preferredFilenameExtension.map { "." + $0 } ?? ""
            done((try? data.write(to: dir.appendingPathComponent((p.suggestedName ?? "file") + ext))) != nil)
        }
    }
}
