import AppKit

/// The DroidLink chain: Material's "link" glyph turned 45°, the same shape as the Android icon.
/// Shared by the menu bar icon and the app icon generator (tools/icon).
enum Glyph {
    /// 24×24 design grid, y down (SVG / Android vector coordinates).
    static let link = "M3.9,12c0,-1.71 1.39,-3.1 3.1,-3.1h4V7H7c-2.76,0 -5,2.24 -5,5s2.24,5 5,5h4v-1.9H7c-1.71,0 -3.1,-1.39 -3.1,-3.1zM8,13h8v-2H8v2zM17,7h-4v1.9h4c1.71,0 3.1,1.39 3.1,3.1s-1.39,3.1 -3.1,3.1h-4V17h4c2.76,0 5,-2.24 5,-5s-2.24,-5 -5,-5z"

    /// The chain centred in `rect` (y up), rising from bottom-left to top-right like the Android icon.
    static func chain(in rect: NSRect) -> NSBezierPath {
        let p = path(link)
        let steps: [AffineTransform] = [
            AffineTransform(translationByX: -12, byY: -12),
            AffineTransform(scaleByX: 1, byY: -1),          // SVG y-down → AppKit y-up
            AffineTransform(rotationByDegrees: 45),
            AffineTransform(scale: min(rect.width, rect.height) / 22),
            AffineTransform(translationByX: rect.midX, byY: rect.midY),
        ]
        for t in steps { p.transform(using: t) }
        return p
    }

    /// Menu bar version: a template image, so macOS tints it for light, dark and highlighted menu bars.
    static func menuBarImage() -> NSImage {
        let image = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { r in
            NSColor.black.setFill()
            chain(in: r).fill()
            return true
        }
        image.isTemplate = true
        image.accessibilityDescription = "DroidLink"
        return image
    }

    /// Parses the SVG path commands the glyph uses (M L H V C S Z, absolute and relative).
    static func path(_ d: String) -> NSBezierPath {
        let p = NSBezierPath()
        let regex = try! NSRegularExpression(pattern: "[A-Za-z]|-?(?:\\d+\\.?\\d*|\\.\\d+)")
        let tokens = regex.matches(in: d, range: NSRange(d.startIndex..., in: d)).map { String(d[Range($0.range, in: d)!]) }
        var i = 0
        var cmd: Character = "M"
        var cur = NSPoint.zero, start = NSPoint.zero
        var lastCtrl: NSPoint?

        func num() -> CGFloat { defer { i += 1 }; return CGFloat(Double(tokens[i])!) }
        func point(from base: NSPoint, relative: Bool) -> NSPoint {
            let x = num(), y = num()
            return relative ? NSPoint(x: base.x + x, y: base.y + y) : NSPoint(x: x, y: y)
        }

        while i < tokens.count {
            if let c = tokens[i].first, c.isLetter {
                cmd = c
                i += 1
                if c == "z" || c == "Z" {
                    p.close()
                    cur = start
                    lastCtrl = nil
                    continue
                }
            }
            let rel = cmd.isLowercase
            let base = cur
            switch cmd.lowercased() {
            case "m":
                cur = point(from: base, relative: rel)
                start = cur
                p.move(to: cur)
                cmd = rel ? "l" : "L" // extra pairs after a move are lines
                lastCtrl = nil
            case "l":
                cur = point(from: base, relative: rel)
                p.line(to: cur)
                lastCtrl = nil
            case "h":
                let x = num()
                cur.x = rel ? cur.x + x : x
                p.line(to: cur)
                lastCtrl = nil
            case "v":
                let y = num()
                cur.y = rel ? cur.y + y : y
                p.line(to: cur)
                lastCtrl = nil
            case "c":
                let c1 = point(from: base, relative: rel), c2 = point(from: base, relative: rel)
                cur = point(from: base, relative: rel)
                p.curve(to: cur, controlPoint1: c1, controlPoint2: c2)
                lastCtrl = c2
            case "s":
                let c1 = lastCtrl.map { NSPoint(x: 2 * base.x - $0.x, y: 2 * base.y - $0.y) } ?? base
                let c2 = point(from: base, relative: rel)
                cur = point(from: base, relative: rel)
                p.curve(to: cur, controlPoint1: c1, controlPoint2: c2)
                lastCtrl = c2
            default:
                i += 1 // unsupported command: skip its number rather than loop forever
            }
        }
        return p
    }
}
