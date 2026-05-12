import CoreLocation
import Foundation
import JoopoKit
import UIKit

typealias JoopoCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias JoopoCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: JoopoCameraSnapParams) async throws -> JoopoCameraSnapResult
    func clip(params: JoopoCameraClipParams) async throws -> JoopoCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: JoopoLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: JoopoLocationGetParams,
        desiredAccuracy: JoopoLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: JoopoLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> JoopoDeviceStatusPayload
    func info() -> JoopoDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: JoopoPhotosLatestParams) async throws -> JoopoPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: JoopoContactsSearchParams) async throws -> JoopoContactsSearchPayload
    func add(params: JoopoContactsAddParams) async throws -> JoopoContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: JoopoCalendarEventsParams) async throws -> JoopoCalendarEventsPayload
    func add(params: JoopoCalendarAddParams) async throws -> JoopoCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: JoopoRemindersListParams) async throws -> JoopoRemindersListPayload
    func add(params: JoopoRemindersAddParams) async throws -> JoopoRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: JoopoMotionActivityParams) async throws -> JoopoMotionActivityPayload
    func pedometer(params: JoopoPedometerParams) async throws -> JoopoPedometerPayload
}

struct WatchMessagingStatus: Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalResolveEvent: Equatable {
    var replyId: String
    var approvalId: String
    var decision: JoopoWatchExecApprovalDecision
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalSnapshotRequestEvent: Equatable {
    var requestId: String
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setStatusHandler(_ handler: (@Sendable (WatchMessagingStatus) -> Void)?)
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func setExecApprovalResolveHandler(_ handler: (@Sendable (WatchExecApprovalResolveEvent) -> Void)?)
    func setExecApprovalSnapshotRequestHandler(
        _ handler: (@Sendable (WatchExecApprovalSnapshotRequestEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: JoopoWatchNotifyParams) async throws -> WatchNotificationSendResult
    func sendExecApprovalPrompt(
        _ message: JoopoWatchExecApprovalPromptMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalResolved(
        _ message: JoopoWatchExecApprovalResolvedMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalExpired(
        _ message: JoopoWatchExecApprovalExpiredMessage) async throws -> WatchNotificationSendResult
    func syncExecApprovalSnapshot(
        _ message: JoopoWatchExecApprovalSnapshotMessage) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
