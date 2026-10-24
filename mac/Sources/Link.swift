import CryptoKit
import Foundation
import Network

/// Encrypted TCP link to the phone. Each frame is a 4-byte big-endian length followed by
/// AES-GCM(nonce | ciphertext | tag) of a JSON object. The phone connects to us.
final class Link {
    static let port: NWEndpoint.Port = 47821
    static let maxFile = 50 << 20
    static let maxFrame = 80 << 20

    var onMessage: (([String: Any]) -> Void)?
    var onState: ((Bool) -> Void)?
    var isConnected: Bool { conn != nil }
    /// The phone's LAN address, or nil when it's not connected or only reachable through an adb tunnel.
    var peerHost: String? {
        guard case .hostPort(let host, _)? = conn?.endpoint, case .ipv4(let ip) = host, !ip.isLoopback else { return nil }
        return "\(ip)"
    }

    private let key: SymmetricKey
    private var listener: NWListener?
    private var browser: NWBrowser?
    private var conn: NWConnection?

    init(key: SymmetricKey) { self.key = key }

    func start() throws {
        let tcp = NWProtocolTCP.Options()
        tcp.enableKeepalive = true
        tcp.keepaliveIdle = 15
        tcp.keepaliveInterval = 5
        tcp.keepaliveCount = 3
        let l = try NWListener(using: NWParameters(tls: nil, tcp: tcp), on: Link.port)
        l.service = NWListener.Service(name: Host.current().localizedName ?? "Mac", type: "_droidlink._tcp")
        l.newConnectionHandler = { [weak self] c in
            c.start(queue: .main)
            self?.read(c)
        }
        l.start(queue: .main)
        listener = l
        // Only listening doesn't make macOS ask for Local Network access, and without it LAN
        // connections are silently never delivered. Browsing does trigger the prompt.
        let b = NWBrowser(for: .bonjour(type: "_droidlink._tcp", domain: nil), using: .tcp)
        b.start(queue: .main)
        browser = b
    }

    func send(_ msg: [String: Any]) {
        guard let conn else { return }
        var m = msg
        m["ts"] = Date().timeIntervalSince1970 * 1000
        guard let plain = try? JSONSerialization.data(withJSONObject: m),
              let box = try? AES.GCM.seal(plain, using: key).combined else { return }
        var frame = withUnsafeBytes(of: UInt32(box.count).bigEndian) { Data($0) }
        frame.append(box)
        conn.send(content: frame, completion: .contentProcessed { _ in })
    }

    // A connection only replaces the current phone once it sends a frame that decrypts,
    // so a stranger on the network can't kick the phone off.
    private func read(_ c: NWConnection) {
        c.receive(minimumIncompleteLength: 4, maximumLength: 4) { [weak self] head, _, _, err in
            guard let self else { return }
            guard let head, head.count == 4, err == nil else { return self.drop(c) }
            let n = head.reduce(0) { $0 << 8 | Int($1) }
            guard n > 28, n <= Link.maxFrame else { return self.drop(c) }
            c.receive(minimumIncompleteLength: n, maximumLength: n) { body, _, _, err in
                // ponytail: a ±2 min timestamp window, not a nonce cache, so a captured frame can be replayed within it.
                guard let body, body.count == n, err == nil,
                      let box = try? AES.GCM.SealedBox(combined: body),
                      let plain = try? AES.GCM.open(box, using: self.key),
                      let msg = try? JSONSerialization.jsonObject(with: plain) as? [String: Any],
                      let ts = msg["ts"] as? Double,
                      abs(Date().timeIntervalSince1970 - ts / 1000) < 120
                else { return self.drop(c) }
                if c !== self.conn {
                    self.conn?.cancel()
                    self.conn = c
                    self.onState?(true)
                }
                self.onMessage?(msg)
                self.read(c)
            }
        }
    }

    private func drop(_ c: NWConnection) {
        c.cancel()
        if c === conn {
            conn = nil
            onState?(false)
        }
    }
}
