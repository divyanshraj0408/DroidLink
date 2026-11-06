import CryptoKit
import Foundation
import Network

/// File transfer modelled on LocalSend: a small offer / accept over the Link, then the file streams
/// in encrypted 1 MiB chunks over a connection of its own, straight from and to disk, so any size
/// works and the Link stays free for notifications and calls. The phone always dials in (port
/// 47822), for both directions, so it never has to accept connections.
///
/// Data frames are framed and sealed like the Link's: 4-byte big-endian length, then
/// AES-GCM(nonce | ciphertext | tag) with the pairing key. The plaintext starts with a type byte:
/// 0 = header JSON {id, dir: "up" | "down"}, 1 = file bytes, 2 = end JSON {sha256}.
/// Control messages on the Link: xfer_offer {id, name, size} either way, xfer_accept {id} from the
/// Mac, xfer_reject / xfer_cancel {id, error} either way.
final class Transfers {
    static let port: NWEndpoint.Port = 47822
    static let chunk = 1 << 20

    struct Item: Identifiable {
        let id: String
        let name: String
        let size: Int64
        let incoming: Bool
        var bytes: Int64 = 0
        var active = false
        /// Outgoing: the file to read. Incoming: where it was saved, once finished.
        var url: URL?
        var error: String?
    }

    private(set) var items: [Item] = []
    /// Progress or a new item; the menu bar shows the total.
    var onChange: (() -> Void)?
    /// Finished, failed or cancelled (error set); the item is gone from `items`.
    var onFinished: ((Item) -> Void)?

    private let key: SymmetricKey
    private let send: ([String: Any]) -> Void
    private let destination: (String) -> URL
    private var listener: NWListener?
    private var conns: [String: NWConnection] = [:]
    private var parts: [String: URL] = [:]

    init(key: SymmetricKey, send: @escaping ([String: Any]) -> Void, destination: @escaping (String) -> URL) {
        self.key = key
        self.send = send
        self.destination = destination
    }

    func start() throws {
        let l = try NWListener(using: .tcp, on: Transfers.port)
        l.newConnectionHandler = { [weak self] c in
            c.start(queue: .main)
            self?.accept(c)
        }
        l.start(queue: .main)
        listener = l
    }

    /// Offers a file to the phone, which accepts by dialing in and asking for it.
    func send(file url: URL) {
        let size = Int64((try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0)
        let item = Item(id: UUID().uuidString, name: url.lastPathComponent, size: size, incoming: false, url: url)
        items.append(item)
        send(["t": "xfer_offer", "id": item.id, "name": item.name, "size": size])
        onChange?()
    }

    func cancel(_ id: String) {
        send(["t": "xfer_cancel", "id": id, "error": "Cancelled on the Mac"])
        finish(id, error: "Cancelled")
    }

    /// The phone dropped off the Link: offers it never picked up won't be.
    func linkDown() {
        for item in items where !item.active { finish(item.id, error: "Phone disconnected") }
    }

    func handle(_ m: [String: Any]) {
        let id = m["id"] as? String ?? ""
        switch m["t"] as? String {
        case "xfer_offer":
            let size = (m["size"] as? NSNumber)?.int64Value ?? 0
            let free = (try? FileManager.default.homeDirectoryForCurrentUser
                .resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
                .volumeAvailableCapacityForImportantUsage) ?? .max
            guard size < free else {
                return send(["t": "xfer_reject", "id": id, "error": "Not enough space on the Mac"])
            }
            items.append(Item(id: id, name: m["name"] as? String ?? "file", size: size, incoming: true))
            send(["t": "xfer_accept", "id": id])
            onChange?()
        case "xfer_reject", "xfer_cancel":
            finish(id, error: m["error"] as? String ?? "Cancelled on the phone")
        default:
            break
        }
    }

    // MARK: Data connections

    private func accept(_ c: NWConnection) {
        readFrame(c) { [weak self] plain in
            guard let self, let plain, plain.first == 0,
                  let h = try? JSONSerialization.jsonObject(with: plain.dropFirst()) as? [String: Any],
                  let id = h["id"] as? String, let i = items.firstIndex(where: { $0.id == id }), !items[i].active,
                  (h["dir"] as? String == "up") == items[i].incoming
            else { return c.cancel() } // unknown, finished or replayed: nothing to do
            items[i].active = true
            conns[id] = c
            if items[i].incoming { receive(c, id) } else { stream(c, id) }
        }
    }

    private func receive(_ c: NWConnection, _ id: String) {
        guard let item = items.first(where: { $0.id == id }) else { return }
        let part = destination(item.name).deletingLastPathComponent().appendingPathComponent(".\(id).droidlink-part")
        FileManager.default.createFile(atPath: part.path, contents: nil)
        guard let out = try? FileHandle(forWritingTo: part) else { return finish(id, error: "Couldn't write to Downloads") }
        parts[id] = part
        var hash = SHA256()

        func next() {
            readFrame(c) { [weak self] plain in
                guard let self, self.conns[id] != nil else {
                    try? out.close()
                    return
                }
                guard let plain, let type = plain.first else {
                    try? out.close()
                    return self.finish(id, error: "Connection lost")
                }
                if type == 1 {
                    let bytes = plain.dropFirst()
                    do { try out.write(contentsOf: bytes) } catch {
                        try? out.close()
                        self.send(["t": "xfer_cancel", "id": id, "error": "The Mac couldn't save it"])
                        return self.finish(id, error: "\(error.localizedDescription)")
                    }
                    hash.update(data: bytes)
                    self.progress(id, by: bytes.count)
                    return next()
                }
                try? out.close()
                let sent = (try? JSONSerialization.jsonObject(with: plain.dropFirst()) as? [String: Any])?["sha256"] as? String
                guard type == 2, sent == hash.finalize().hex else {
                    self.send(["t": "xfer_cancel", "id": id, "error": "Checksum mismatch on the Mac"])
                    return self.finish(id, error: "Checksum mismatch")
                }
                let final = self.destination(item.name)
                do { try FileManager.default.moveItem(at: part, to: final) } catch {
                    return self.finish(id, error: error.localizedDescription)
                }
                self.parts[id] = nil
                if let i = self.items.firstIndex(where: { $0.id == id }) { self.items[i].url = final }
                self.finish(id, error: nil)
            }
        }
        next()
    }

    private func stream(_ c: NWConnection, _ id: String) {
        guard let url = items.first(where: { $0.id == id })?.url, let file = try? FileHandle(forReadingFrom: url) else {
            send(["t": "xfer_cancel", "id": id, "error": "The Mac couldn't read the file"])
            return finish(id, error: "Couldn't read the file")
        }
        var hash = SHA256()

        func next() {
            guard conns[id] != nil else { // cancelled
                try? file.close()
                return
            }
            let data = (try? file.read(upToCount: Transfers.chunk)) ?? Data()
            if data.isEmpty {
                try? file.close()
                let end = (try? JSONSerialization.data(withJSONObject: ["sha256": hash.finalize().hex])) ?? Data()
                // The phone checks the hash and closes; a mismatch comes back as xfer_cancel.
                return c.send(content: frame(type: 2, end), completion: .contentProcessed { [weak self] _ in
                    self?.finish(id, error: nil)
                })
            }
            hash.update(data: data)
            c.send(content: frame(type: 1, data), completion: .contentProcessed { [weak self] err in
                guard let self else { return }
                if err != nil {
                    try? file.close()
                    return self.finish(id, error: "Connection lost")
                }
                self.progress(id, by: data.count)
                next()
            })
        }
        next()
    }

    private func progress(_ id: String, by n: Int) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].bytes += Int64(n)
        onChange?()
    }

    private func finish(_ id: String, error: String?) {
        conns.removeValue(forKey: id)?.cancel()
        if let part = parts.removeValue(forKey: id) { try? FileManager.default.removeItem(at: part) }
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        var item = items.remove(at: i)
        item.error = error
        onFinished?(item)
        onChange?()
    }

    // MARK: Framing

    private func frame(type: UInt8, _ payload: Data) -> Data {
        var plain = Data([type])
        plain.append(payload)
        let box = try! AES.GCM.seal(plain, using: key).combined!
        var f = withUnsafeBytes(of: UInt32(box.count).bigEndian) { Data($0) }
        f.append(box)
        return f
    }

    private func readFrame(_ c: NWConnection, _ done: @escaping (Data?) -> Void) {
        c.receive(minimumIncompleteLength: 4, maximumLength: 4) { [key] head, _, _, err in
            guard let head, head.count == 4, err == nil else { return done(nil) }
            let n = head.reduce(0) { $0 << 8 | Int($1) }
            guard n > 28, n <= Transfers.chunk + 64 else { return done(nil) }
            c.receive(minimumIncompleteLength: n, maximumLength: n) { body, _, _, err in
                guard let body, body.count == n, err == nil,
                      let box = try? AES.GCM.SealedBox(combined: body),
                      let plain = try? AES.GCM.open(box, using: key) else { return done(nil) }
                done(plain)
            }
        }
    }
}

extension SHA256.Digest {
    var hex: String { map { String(format: "%02x", $0) }.joined() }
}
