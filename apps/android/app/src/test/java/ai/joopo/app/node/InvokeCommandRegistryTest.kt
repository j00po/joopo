package ai.joopo.app.node

import ai.joopo.app.protocol.JoopoCalendarCommand
import ai.joopo.app.protocol.JoopoCallLogCommand
import ai.joopo.app.protocol.JoopoCameraCommand
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
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      JoopoCapability.Canvas.rawValue,
      JoopoCapability.Device.rawValue,
      JoopoCapability.Notifications.rawValue,
      JoopoCapability.System.rawValue,
      JoopoCapability.Talk.rawValue,
      JoopoCapability.Photos.rawValue,
      JoopoCapability.Contacts.rawValue,
      JoopoCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      JoopoCapability.Camera.rawValue,
      JoopoCapability.Location.rawValue,
      JoopoCapability.Sms.rawValue,
      JoopoCapability.CallLog.rawValue,
      JoopoCapability.VoiceWake.rawValue,
      JoopoCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      JoopoDeviceCommand.Status.rawValue,
      JoopoDeviceCommand.Info.rawValue,
      JoopoDeviceCommand.Permissions.rawValue,
      JoopoDeviceCommand.Health.rawValue,
      JoopoNotificationsCommand.List.rawValue,
      JoopoNotificationsCommand.Actions.rawValue,
      JoopoSystemCommand.Notify.rawValue,
      JoopoTalkCommand.PttStart.rawValue,
      JoopoTalkCommand.PttStop.rawValue,
      JoopoTalkCommand.PttCancel.rawValue,
      JoopoTalkCommand.PttOnce.rawValue,
      JoopoPhotosCommand.Latest.rawValue,
      JoopoContactsCommand.Search.rawValue,
      JoopoContactsCommand.Add.rawValue,
      JoopoCalendarCommand.Events.rawValue,
      JoopoCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      JoopoCameraCommand.Snap.rawValue,
      JoopoCameraCommand.Clip.rawValue,
      JoopoCameraCommand.List.rawValue,
      JoopoLocationCommand.Get.rawValue,
      JoopoMotionCommand.Activity.rawValue,
      JoopoMotionCommand.Pedometer.rawValue,
      JoopoSmsCommand.Send.rawValue,
      JoopoSmsCommand.Search.rawValue,
      JoopoCallLogCommand.Search.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          smsSearchPossible = false,
          callLogAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(JoopoMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(JoopoMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true, smsSearchPossible = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCommands.contains(JoopoSmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(JoopoSmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(JoopoSmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(JoopoSmsCommand.Search.rawValue))
    assertTrue(requestableSearchCommands.contains(JoopoSmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCapabilities.contains(JoopoCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(JoopoCapability.Sms.rawValue))
    assertFalse(requestableSearchCapabilities.contains(JoopoCapability.Sms.rawValue))
  }

  @Test
  fun advertisedCommands_excludesCallLogWhenUnavailable() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(callLogAvailable = false))

    assertFalse(commands.contains(JoopoCallLogCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_excludesCallLogWhenUnavailable() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(callLogAvailable = false))

    assertFalse(capabilities.contains(JoopoCapability.CallLog.rawValue))
  }

  @Test
  fun advertisedCapabilities_includesVoiceWakeWithoutAdvertisingCommands() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(voiceWakeEnabled = true))
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(voiceWakeEnabled = true))

    assertTrue(capabilities.contains(JoopoCapability.VoiceWake.rawValue))
    assertFalse(commands.any { it.contains("voice", ignoreCase = true) })
  }

  @Test
  fun find_returnsForegroundMetadataForCameraCommands() {
    val list = InvokeCommandRegistry.find(JoopoCameraCommand.List.rawValue)
    val location = InvokeCommandRegistry.find(JoopoLocationCommand.Get.rawValue)

    assertNotNull(list)
    assertEquals(true, list?.requiresForeground)
    assertNotNull(location)
    assertEquals(false, location?.requiresForeground)
  }

  @Test
  fun find_returnsNullForUnknownCommand() {
    assertNull(InvokeCommandRegistry.find("not.real"))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      smsSearchPossible = smsSearchPossible,
      callLogAvailable = callLogAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(
    actual: List<String>,
    expected: Set<String>,
  ) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(
    actual: List<String>,
    forbidden: Set<String>,
  ) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
