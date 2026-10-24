import AppKit
import SwiftUI

/// Phone calls, controlled from the Mac the way Continuity does it on an iPhone: a floating card
/// for incoming and ongoing calls, and a keypad for dialing. The audio stays on the phone.
final class Calls: ObservableObject {
    enum State { case idle, ringing, calling, active, ended }

    @Published var state = State.idle
    @Published var name = ""
    @Published var number = ""
    @Published var since = Date()
    @Published var dialed = ""
    @Published var error: String?
    /// Shown under the caller's name, like "iPhone" on a Mac.
    var device = "Phone"
    var contacts: () -> [Messages.Contact] = { [] }

    private let send: ([String: Any]) -> Void
    private let panel = CallPanel()
    private var ringtone: NSSound?

    init(send: @escaping ([String: Any]) -> Void) { self.send = send }

    var title: String {
        if !name.isEmpty, name != number { return name }
        return number.isEmpty ? "Unknown Caller" : number
    }

    func handle(_ m: [String: Any]) {
        if m["t"] as? String == "call_error" {
            error = m["error"] as? String
            return setState(.ended)
        }
        if let n = m["number"] as? String, !n.isEmpty { number = n }
        if let n = m["name"] as? String, !n.isEmpty { name = n }
        switch m["state"] as? String {
        case "ringing": setState(.ringing)
        case "active": setState(.active)
        case "ended": setState(.ended)
        default: break
        }
    }

    func answer() { send(["t": "call_answer"]) }

    func end() {
        send(["t": "call_end"])
        if state == .calling { setState(.ended) } // phone may not have started yet
    }

    func dial(_ raw: String) {
        let to = raw.trimmingCharacters(in: .whitespaces)
        guard Messages.digits(to).count >= 3 else { return }
        number = to
        name = contacts().first { Messages.digits($0.number).hasSuffix(Messages.digits(to).suffix(10)) }?.name ?? ""
        error = nil
        dialed = ""
        setState(.calling)
        send(["t": "call_dial", "number": to])
    }

    /// The phone disappeared mid-call: drop the card rather than leave it hanging.
    func disconnected() {
        if state != .idle { setState(.ended) }
    }

    private func setState(_ new: State) {
        // Android repeats states (the second "ringing" adds the number); keep the timer running.
        if new == .active, state == .active { return }
        if new == .active || new == .calling { since = Date() }
        if new == .ended, state == .idle { return }
        state = new
        ring(new == .ringing)
        if new == .ended {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                guard let self, self.state == .ended else { return }
                self.state = .idle
                self.name = ""
                self.number = ""
                self.error = nil
                self.panel.hide()
            }
        }
        panel.show(CallCard(calls: self))
    }

    private func ring(_ on: Bool) {
        if on, ringtone == nil {
            ringtone = NSSound(named: "Submarine") ?? NSSound(named: "Glass")
            ringtone?.loops = true
            ringtone?.play()
        } else if !on {
            ringtone?.stop()
            ringtone = nil
        }
    }
}

/// Borderless floating panel in the top-right corner, over full-screen apps, that never steals focus.
final class CallPanel {
    private var panel: NSPanel?

    func show(_ view: some View) {
        let p = panel ?? {
            let p = NSPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
            p.isOpaque = false
            p.backgroundColor = .clear
            p.hasShadow = true
            p.level = .floating
            p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            p.isMovableByWindowBackground = true
            p.contentView = NSHostingView(rootView: view)
            return p
        }()
        panel = p
        p.setContentSize(p.contentView?.fittingSize ?? NSSize(width: 360, height: 76))
        if let screen = NSScreen.main?.visibleFrame {
            p.setFrameOrigin(NSPoint(x: screen.maxX - p.frame.width - 12, y: screen.maxY - p.frame.height - 12))
        }
        p.orderFrontRegardless()
    }

    func hide() { panel?.orderOut(nil) }
}

struct CallCard: View {
    @ObservedObject var calls: Calls

    var body: some View {
        HStack(spacing: 12) {
            Avatar(name: calls.title, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(calls.title).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                subtitle.font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 12)
            switch calls.state {
            case .ringing:
                RoundButton(color: .red, symbol: "phone.down.fill", label: "Decline", action: calls.end)
                RoundButton(color: .green, symbol: "phone.fill", label: "Accept", action: calls.answer)
            case .calling, .active:
                RoundButton(color: .red, symbol: "phone.down.fill", label: "End", action: calls.end)
            case .ended, .idle:
                EmptyView()
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(width: 360)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.primary.opacity(0.08)))
    }

    @ViewBuilder private var subtitle: some View {
        switch calls.state {
        case .ringing:
            Text(calls.device)
        case .calling:
            Text("Calling…")
        case .active:
            if let error = calls.error {
                Text(error).foregroundStyle(.orange).help(error)
            } else {
                TimelineView(.periodic(from: calls.since, by: 1)) { ctx in
                    Text("\(duration(ctx.date.timeIntervalSince(calls.since))) · audio on \(calls.device)")
                }
            }
        case .ended, .idle:
            Text(calls.error ?? "Call Ended")
        }
    }

    private func duration(_ t: TimeInterval) -> String {
        let s = max(0, Int(t))
        return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
                         : String(format: "%d:%02d", s / 60, s % 60)
    }
}

struct RoundButton: View {
    let color: Color
    let symbol: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 38, height: 38)
                .background(color, in: Circle())
        }
        .buttonStyle(.plain)
        .help(label)
        .accessibilityLabel(label)
    }
}

/// Grey gradient circle with initials, or a person glyph for bare numbers, like Contacts.
struct Avatar: View {
    let name: String
    let size: CGFloat

    private var initials: String {
        let words = name.split(separator: " ").filter { $0.first?.isLetter == true }
        return String(words.prefix(2).compactMap(\.first)).uppercased()
    }

    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors: [Color(white: 0.66), Color(white: 0.5)], startPoint: .top, endPoint: .bottom))
            if initials.isEmpty {
                Image(systemName: "person.fill").font(.system(size: size * 0.5)).foregroundStyle(.white)
            } else {
                Text(initials).font(.system(size: size * 0.4, weight: .medium, design: .rounded)).foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
    }
}

/// The iPhone Phone keypad: big number, round keys with letters, green call button.
struct KeypadView: View {
    @ObservedObject var calls: Calls

    private let rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["*", "0", "#"]]
    private let letters = ["2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO",
                           "7": "PQRS", "8": "TUV", "9": "WXYZ", "0": "+"]

    /// Contacts whose name or number matches what's typed.
    private var matches: [Messages.Contact] {
        let q = calls.dialed.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        let digits = Messages.digits(q)
        return Array(calls.contacts().filter {
            (digits.isEmpty && $0.name.lowercased().contains(q)) || (!digits.isEmpty && Messages.digits($0.number).contains(digits))
        }.prefix(3))
    }

    var body: some View {
        VStack(spacing: 14) {
            TextField("", text: $calls.dialed, prompt: Text("Enter number or name"))
                .font(.system(size: 30, weight: .light))
                .multilineTextAlignment(.center)
                .textFieldStyle(.plain)
                .onSubmit { calls.dial(matches.count == 1 && Messages.digits(calls.dialed).isEmpty ? matches[0].number : calls.dialed) }
            VStack(spacing: 2) {
                ForEach(matches, id: \.self) { c in
                    Button { calls.dialed = c.number } label: {
                        Text("\(c.name)  \(c.number)").font(.system(size: 12)).foregroundStyle(Color.accentColor)
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(height: 48, alignment: .top)

            VStack(spacing: 14) {
                ForEach(rows, id: \.self) { row in
                    HStack(spacing: 22) {
                        ForEach(row, id: \.self) { key in
                            Button { calls.dialed += key } label: {
                                VStack(spacing: -1) {
                                    Text(key).font(.system(size: 28, weight: .regular))
                                    Text(letters[key] ?? " ").font(.system(size: 9, weight: .bold)).tracking(1.5)
                                }
                                .frame(width: 66, height: 66)
                                .background(Color.primary.opacity(0.1), in: Circle())
                                .contentShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            HStack(spacing: 22) {
                Color.clear.frame(width: 66, height: 66)
                Button { calls.dial(calls.dialed) } label: {
                    Image(systemName: "phone.fill").font(.system(size: 26)).foregroundStyle(.white)
                        .frame(width: 66, height: 66).background(Color.green, in: Circle())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.defaultAction)
                .help("Call on your phone")
                Button { if !calls.dialed.isEmpty { calls.dialed.removeLast() } } label: {
                    Image(systemName: "delete.left.fill").font(.system(size: 22)).foregroundStyle(.secondary)
                        .frame(width: 66, height: 66).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .opacity(calls.dialed.isEmpty ? 0 : 1)
            }
        }
        .padding(.horizontal, 28)
        .padding(.top, 36)
        .padding(.bottom, 26)
        .frame(width: 320)
    }
}
