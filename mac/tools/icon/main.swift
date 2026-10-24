// Renders mac/AppIcon.icns from Glyph.swift: macOS rounded-square tile, dark gradient, silver chain.
// Run: mac/tools/icon/make.sh
import AppKit

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px) / 1024 // design on Apple's 1024 grid: 824pt tile, 100pt margin

    let tile = NSRect(x: 100 * s, y: 100 * s, width: 824 * s, height: 824 * s)
    let shape = NSBezierPath(roundedRect: tile, xRadius: 185 * s, yRadius: 185 * s)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.35)
    shadow.shadowBlurRadius = 24 * s
    shadow.shadowOffset = NSSize(width: 0, height: -10 * s)
    NSGraphicsContext.saveGraphicsState()
    shadow.set()
    NSColor(white: 0.11, alpha: 1).setFill()
    shape.fill()
    NSGraphicsContext.restoreGraphicsState()
    NSGradient(colors: [NSColor(white: 0.11, alpha: 1), NSColor(white: 0.23, alpha: 1)])!.draw(in: shape, angle: 90)
    NSColor(white: 1, alpha: 0.08).setStroke()
    shape.lineWidth = 3 * s
    shape.stroke()

    let chain = Glyph.chain(in: tile.insetBy(dx: 115 * s, dy: 115 * s))
    NSGraphicsContext.saveGraphicsState()
    let glow = NSShadow()
    glow.shadowColor = NSColor.black.withAlphaComponent(0.5)
    glow.shadowBlurRadius = 14 * s
    glow.shadowOffset = NSSize(width: 0, height: -6 * s)
    glow.set()
    NSColor(white: 0.6, alpha: 1).setFill()
    chain.fill()
    NSGraphicsContext.restoreGraphicsState()
    // Silver, like the Android foreground: white on top, grey at the bottom.
    NSGradient(colors: [NSColor(srgbRed: 0.56, green: 0.58, blue: 0.61, alpha: 1),
                        NSColor(srgbRed: 0.79, green: 0.80, blue: 0.82, alpha: 1),
                        .white])!.draw(in: chain, angle: 90)

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

let out = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
for pt in [16, 32, 128, 256, 512] {
    try! render(pt).write(to: out.appendingPathComponent("icon_\(pt)x\(pt).png"))
    try! render(pt * 2).write(to: out.appendingPathComponent("icon_\(pt)x\(pt)@2x.png"))
}
