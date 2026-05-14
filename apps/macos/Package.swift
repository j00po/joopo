// swift-tools-version: 6.2
// Package manifest for the Joopo macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Joopo",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "JoopoIPC", targets: ["JoopoIPC"]),
        .library(name: "JoopoDiscovery", targets: ["JoopoDiscovery"]),
        .executable(name: "Joopo", targets: ["Joopo"]),
        .executable(name: "joopo-mac", targets: ["JoopoMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.3.0"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.4.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.10.1"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.0"),
        .package(url: "https://github.com/steipete/Peekaboo.git", exact: "3.1.2"),
        .package(path: "../shared/JoopoKit"),
        .package(path: "../swabble"),
    ],
    targets: [
        .target(
            name: "JoopoIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "JoopoDiscovery",
            dependencies: [
                .product(name: "JoopoKit", package: "JoopoKit"),
            ],
            path: "Sources/JoopoDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Joopo",
            dependencies: [
                "JoopoIPC",
                "JoopoDiscovery",
                .product(name: "JoopoKit", package: "JoopoKit"),
                .product(name: "JoopoChatUI", package: "JoopoKit"),
                .product(name: "JoopoProtocol", package: "JoopoKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Joopo.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "JoopoMacCLI",
            dependencies: [
                "JoopoDiscovery",
                .product(name: "JoopoKit", package: "JoopoKit"),
                .product(name: "JoopoProtocol", package: "JoopoKit"),
            ],
            path: "Sources/JoopoMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "JoopoIPCTests",
            dependencies: [
                "JoopoIPC",
                "Joopo",
                "JoopoDiscovery",
                .product(name: "JoopoProtocol", package: "JoopoKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
