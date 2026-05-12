import Foundation

public enum JoopoCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum JoopoCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum JoopoCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum JoopoCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct JoopoCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: JoopoCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: JoopoCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: JoopoCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: JoopoCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct JoopoCameraClipParams: Codable, Sendable, Equatable {
    public var facing: JoopoCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: JoopoCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: JoopoCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: JoopoCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
