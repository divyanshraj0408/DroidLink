// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "DroidLink",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "DroidLink", path: "Sources", swiftSettings: [.swiftLanguageMode(.v5)])
    ]
)
