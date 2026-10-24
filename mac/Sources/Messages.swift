import SwiftUI

/// SMS conversations from the phone. The phone owns the data; this asks for it and redraws.
final class Messages: ObservableObject {
    struct Thread: Identifiable, Hashable {
        let id: Int
        let address: String
        let name: String
        let snippet: String
        let date: Date
    }

    struct Message: Identifiable {
        let id: Int
        let body: String
        let date: Date
        let out: Bool
        let failed: Bool
    }

    struct Contact: Hashable {
        let name: String
        let number: String
    }

    @Published var threads: [Thread] = []
    @Published var messages: [Message] = []
    @Published var contacts: [Contact] = []
    @Published var connected = false
    @Published var error: String?
    // View state lives here: the Command Line Tools ship no SwiftUI macro plugin, so no @State.
    @Published var composing = false
    @Published var draft = ""
    @Published var composeTo = ""
    @Published var composeText = ""
    @Published var selected: Thread.ID? {
        didSet { if selected != oldValue { messages = []; loadThread() } }
    }
    /// Number we just texted from "New Message"; selects its conversation once the phone reports it.
    var pendingAddress: String?
    var current: Thread? { threads.first { $0.id == selected } }
    var onCall: ((String) -> Void)?

    private let send: ([String: Any]) -> Void
    private var refreshWork: DispatchWorkItem?

    init(send: @escaping ([String: Any]) -> Void) { self.send = send }

    func refresh() {
        send(["t": "sms_threads"])
        loadThread()
    }

    func loadContacts() { send(["t": "contacts"]) }

    func loadThread() {
        if let selected { send(["t": "sms_thread", "thread": selected]) }
    }

    func sendText(to: String, _ text: String) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !to.isEmpty, !text.isEmpty else { return }
        error = nil
        send(["t": "sms_send", "to": to, "text": text])
    }

    /// The phone reports a change for every row it writes, so batch them.
    func changed() {
        refreshWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.refresh() }
        refreshWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: work)
    }

    func handle(_ m: [String: Any]) {
        let date = { (o: [String: Any]) in Date(timeIntervalSince1970: (o["date"] as? Double ?? 0) / 1000) }
        switch m["t"] as? String {
        case "sms_threads":
            threads = (m["threads"] as? [[String: Any]] ?? []).map {
                Thread(id: $0["id"] as? Int ?? 0, address: $0["address"] as? String ?? "",
                       name: $0["name"] as? String ?? "", snippet: $0["snippet"] as? String ?? "", date: date($0))
            }
            if let want = pendingAddress.map(Messages.digits),
               let t = threads.first(where: { Messages.digits($0.address).hasSuffix(want.suffix(10)) }) {
                pendingAddress = nil
                selected = t.id
            }
        case "sms_thread":
            guard m["thread"] as? Int == selected else { return }
            messages = (m["messages"] as? [[String: Any]] ?? []).map {
                Message(id: $0["id"] as? Int ?? 0, body: $0["body"] as? String ?? "", date: date($0),
                        out: $0["out"] as? Bool ?? false, failed: $0["failed"] as? Bool ?? false)
            }
        case "contacts":
            contacts = (m["contacts"] as? [[String: Any]] ?? []).compactMap {
                guard let n = $0["name"] as? String, let num = $0["number"] as? String else { return nil }
                return Contact(name: n, number: num)
            }
        case "sms_sent":
            if m["ok"] as? Bool == false { error = "Couldn't send: \(m["error"] as? String ?? "unknown error")" }
        case "sms_changed":
            changed()
        default:
            break
        }
    }

    static func digits(_ s: String) -> String { s.filter(\.isNumber) }
}

struct MessagesView: View {
    @ObservedObject var model: Messages

    var body: some View {
        NavigationSplitView {
            List(model.threads, selection: $model.selected) { t in
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(t.name.isEmpty ? t.address : t.name).font(.headline).lineLimit(1)
                        Spacer()
                        Text(t.date, format: .relative(presentation: .numeric)).font(.caption).foregroundStyle(.secondary)
                    }
                    Text(t.snippet).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                }
                .padding(.vertical, 3)
            }
            .navigationSplitViewColumnWidth(min: 220, ideal: 280)
            .toolbar {
                Button { model.refresh() } label: { Label("Refresh", systemImage: "arrow.clockwise") }
                Button { model.composing = true } label: { Label("New Message", systemImage: "square.and.pencil") }
                    .keyboardShortcut("n")
            }
            .overlay {
                if !model.connected { ContentUnavailableView("Phone not connected", systemImage: "iphone.slash") }
                else if model.threads.isEmpty { ProgressView() }
            }
        } detail: {
            if let t = model.current {
                ConversationView(model: model, thread: t)
            } else {
                ContentUnavailableView("No conversation selected", systemImage: "message",
                                       description: Text("Pick one on the left, or press ⌘N for a new message."))
            }
        }
        .sheet(isPresented: $model.composing) { ComposeView(model: model) }
        .onAppear { model.refresh(); model.loadContacts() }
    }
}

struct ConversationView: View {
    @ObservedObject var model: Messages
    let thread: Messages.Thread

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        ForEach(model.messages) { Bubble(message: $0).id($0.id) }
                    }
                    .padding()
                }
                .onChange(of: model.messages.last?.id) { _, last in
                    if let last { proxy.scrollTo(last, anchor: .bottom) }
                }
            }
            if let error = model.error {
                Text(error).font(.caption).foregroundStyle(.red).padding(.horizontal)
            }
            Divider()
            HStack(alignment: .bottom) {
                TextField("Text message", text: $model.draft, axis: .vertical)
                    .textFieldStyle(.plain)
                    .lineLimit(1...6)
                    .onSubmit(send)
                Button(action: send) { Image(systemName: "arrow.up.circle.fill").font(.title2) }
                    .buttonStyle(.plain)
                    .foregroundStyle(model.draft.isEmpty ? Color.secondary : Color.accentColor)
                    .disabled(model.draft.isEmpty)
                    .help("Send (Return). Shift-Return for a new line.")
            }
            .padding(10)
        }
        .toolbar {
            Button { model.onCall?(thread.address) } label: { Label("Call", systemImage: "phone") }
                .help("Call on your phone")
        }
        .navigationTitle(thread.name.isEmpty ? thread.address : thread.name)
        .navigationSubtitle(thread.name == thread.address ? "" : thread.address)
    }

    private func send() {
        model.sendText(to: thread.address, model.draft)
        model.draft = ""
    }
}

struct Bubble: View {
    let message: Messages.Message

    var body: some View {
        HStack {
            if message.out { Spacer(minLength: 60) }
            Text(message.body)
                .textSelection(.enabled)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(message.failed ? Color.red.opacity(0.8) : message.out ? Color.accentColor : Color.secondary.opacity(0.2),
                            in: RoundedRectangle(cornerRadius: 16))
                .foregroundStyle(message.out ? Color.white : Color.primary)
                .help(message.date.formatted(date: .abbreviated, time: .shortened) + (message.failed ? " · not sent" : ""))
            if !message.out { Spacer(minLength: 60) }
        }
    }
}

struct ComposeView: View {
    @ObservedObject var model: Messages
    private var to: String { model.composeTo }
    private var text: String { model.composeText }
    private func dismiss() { model.composing = false; model.composeTo = ""; model.composeText = "" }

    /// Contacts matching what's typed; once a number is picked, `to` holds digits and this empties.
    private var matches: [Messages.Contact] {
        let q = to.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        let digits = Messages.digits(q)
        return Array(model.contacts.filter {
            $0.name.lowercased().contains(q) || (!digits.isEmpty && Messages.digits($0.number).contains(digits))
        }.prefix(6))
    }

    private var number: String {
        let trimmed = to.trimmingCharacters(in: .whitespaces)
        return model.contacts.first { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }?.number ?? trimmed
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("New Message").font(.headline)
            TextField("To: name or number", text: $model.composeTo)
            if !matches.isEmpty, matches.first?.number != to {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(matches, id: \.self) { c in
                        Button { model.composeTo = c.number } label: {
                            HStack { Text(c.name); Spacer(); Text(c.number).foregroundStyle(.secondary) }
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .padding(.vertical, 4)
                    }
                }
                .padding(8)
                .background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
            }
            TextField("Message", text: $model.composeText, axis: .vertical).lineLimit(3...8)
            HStack {
                Spacer()
                Button("Cancel", role: .cancel) { dismiss() }.keyboardShortcut(.cancelAction)
                Button("Send") {
                    model.pendingAddress = number
                    model.sendText(to: number, text)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(Messages.digits(number).count < 3 || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(20)
        .frame(width: 380)
    }
}
