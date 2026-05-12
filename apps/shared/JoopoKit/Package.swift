// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "JoopoKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "JoopoProtocol", targets: ["JoopoProtocol"]),
        .library(name: "JoopoKit", targets: ["JoopoKit"]),
        .library(name: "JoopoChatUI", targets: ["JoopoChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.1"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "JoopoProtocol",
            path: "Sources/JoopoProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "JoopoKit",
            dependencies: [
                "JoopoProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/JoopoKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "JoopoChatUI",
            dependencies: [
                "JoopoKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/JoopoChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "JoopoKitTests",
            dependencies: ["JoopoKit", "JoopoChatUI"],
            path: "Tests/JoopoKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
