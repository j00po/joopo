package ai.joopo.app.node

import ai.joopo.app.protocol.JoopoCalendarCommand
import ai.joopo.app.protocol.JoopoCallLogCommand
import ai.joopo.app.protocol.JoopoCameraCommand
import ai.joopo.app.protocol.JoopoCanvasA2UICommand
import ai.joopo.app.protocol.JoopoCanvasCommand
import ai.joopo.app.protocol.JoopoCapability
import ai.joopo.app.protocol.JoopoContactsCommand
import ai.joopo.app.protocol.JoopoDeviceCommand
import ai.joopo.app.protocol.JoopoLocationCommand
import ai.joopo.app.protocol.JoopoMotionCommand
import ai.joopo.app.protocol.JoopoNotificationsCommand
import ai.joopo.app.protocol.JoopoPhotosCommand
import ai.joopo.app.protocol.JoopoSmsCommand
import ai.joopo.app.protocol.JoopoSystemCommand
import ai.joopo.app.protocol.JoopoTalkCommand

data class NodeRuntimeFlags(
  val cameraEnabled: Boolean,
  val locationEnabled: Boolean,
  val sendSmsAvailable: Boolean,
  val readSmsAvailable: Boolean,
  val smsSearchPossible: Boolean,
  val callLogAvailable: Boolean,
  val voiceWakeEnabled: Boolean,
  val motionActivityAvailable: Boolean,
  val motionPedometerAvailable: Boolean,
  val debugBuild: Boolean,
)

enum class InvokeCommandAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SendSmsAvailable,
  ReadSmsAvailable,
  RequestableSmsSearchAvailable,
  CallLogAvailable,
  MotionActivityAvailable,
  MotionPedometerAvailable,
  DebugBuild,
}

enum class NodeCapabilityAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  CallLogAvailable,
  VoiceWakeEnabled,
  MotionAvailable,
}

data class NodeCapabilitySpec(
  val name: String,
  val availability: NodeCapabilityAvailability = NodeCapabilityAvailability.Always,
)

data class InvokeCommandSpec(
  val name: String,
  val requiresForeground: Boolean = false,
  val availability: InvokeCommandAvailability = InvokeCommandAvailability.Always,
)

object InvokeCommandRegistry {
  val capabilityManifest: List<NodeCapabilitySpec> =
    listOf(
      NodeCapabilitySpec(name = JoopoCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = JoopoCapability.Device.rawValue),
      NodeCapabilitySpec(name = JoopoCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = JoopoCapability.System.rawValue),
      NodeCapabilitySpec(
        name = JoopoCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = JoopoCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = JoopoCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(name = JoopoCapability.Talk.rawValue),
      NodeCapabilitySpec(
        name = JoopoCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = JoopoCapability.Photos.rawValue),
      NodeCapabilitySpec(name = JoopoCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = JoopoCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = JoopoCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
      NodeCapabilitySpec(
        name = JoopoCapability.CallLog.rawValue,
        availability = NodeCapabilityAvailability.CallLogAvailable,
      ),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = JoopoCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = JoopoSystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoTalkCommand.PttStart.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoTalkCommand.PttStop.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoTalkCommand.PttCancel.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoTalkCommand.PttOnce.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = JoopoCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = JoopoCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = JoopoLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = JoopoDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = JoopoMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = JoopoMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = JoopoSmsCommand.Send.rawValue,
        availability = InvokeCommandAvailability.SendSmsAvailable,
      ),
      InvokeCommandSpec(
        name = JoopoSmsCommand.Search.rawValue,
        availability = InvokeCommandAvailability.RequestableSmsSearchAvailable,
      ),
      InvokeCommandSpec(
        name = JoopoCallLogCommand.Search.rawValue,
        availability = InvokeCommandAvailability.CallLogAvailable,
      ),
      InvokeCommandSpec(
        name = "debug.logs",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(
        name = "debug.ed25519",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
    )

  private val byNameInternal: Map<String, InvokeCommandSpec> = all.associateBy { it.name }

  fun find(command: String): InvokeCommandSpec? = byNameInternal[command]

  fun advertisedCapabilities(flags: NodeRuntimeFlags): List<String> =
    capabilityManifest
      .filter { spec ->
        when (spec.availability) {
          NodeCapabilityAvailability.Always -> true
          NodeCapabilityAvailability.CameraEnabled -> flags.cameraEnabled
          NodeCapabilityAvailability.LocationEnabled -> flags.locationEnabled
          NodeCapabilityAvailability.SmsAvailable -> flags.sendSmsAvailable || flags.readSmsAvailable
          NodeCapabilityAvailability.CallLogAvailable -> flags.callLogAvailable
          NodeCapabilityAvailability.VoiceWakeEnabled -> flags.voiceWakeEnabled
          NodeCapabilityAvailability.MotionAvailable -> flags.motionActivityAvailable || flags.motionPedometerAvailable
        }
      }.map { it.name }

  fun advertisedCommands(flags: NodeRuntimeFlags): List<String> =
    all
      .filter { spec ->
        when (spec.availability) {
          InvokeCommandAvailability.Always -> true
          InvokeCommandAvailability.CameraEnabled -> flags.cameraEnabled
          InvokeCommandAvailability.LocationEnabled -> flags.locationEnabled
          InvokeCommandAvailability.SendSmsAvailable -> flags.sendSmsAvailable
          InvokeCommandAvailability.ReadSmsAvailable -> flags.readSmsAvailable
          InvokeCommandAvailability.RequestableSmsSearchAvailable -> flags.smsSearchPossible
          InvokeCommandAvailability.CallLogAvailable -> flags.callLogAvailable
          InvokeCommandAvailability.MotionActivityAvailable -> flags.motionActivityAvailable
          InvokeCommandAvailability.MotionPedometerAvailable -> flags.motionPedometerAvailable
          InvokeCommandAvailability.DebugBuild -> flags.debugBuild
        }
      }.map { it.name }
}
