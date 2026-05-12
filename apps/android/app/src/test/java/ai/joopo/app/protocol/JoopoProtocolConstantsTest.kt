package ai.joopo.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class JoopoProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", JoopoCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", JoopoCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", JoopoCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", JoopoCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", JoopoCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", JoopoCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", JoopoCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", JoopoCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", JoopoCapability.Canvas.rawValue)
    assertEquals("camera", JoopoCapability.Camera.rawValue)
    assertEquals("voiceWake", JoopoCapability.VoiceWake.rawValue)
    assertEquals("talk", JoopoCapability.Talk.rawValue)
    assertEquals("location", JoopoCapability.Location.rawValue)
    assertEquals("sms", JoopoCapability.Sms.rawValue)
    assertEquals("device", JoopoCapability.Device.rawValue)
    assertEquals("notifications", JoopoCapability.Notifications.rawValue)
    assertEquals("system", JoopoCapability.System.rawValue)
    assertEquals("photos", JoopoCapability.Photos.rawValue)
    assertEquals("contacts", JoopoCapability.Contacts.rawValue)
    assertEquals("calendar", JoopoCapability.Calendar.rawValue)
    assertEquals("motion", JoopoCapability.Motion.rawValue)
    assertEquals("callLog", JoopoCapability.CallLog.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", JoopoCameraCommand.List.rawValue)
    assertEquals("camera.snap", JoopoCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", JoopoCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", JoopoNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", JoopoNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", JoopoDeviceCommand.Status.rawValue)
    assertEquals("device.info", JoopoDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", JoopoDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", JoopoDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", JoopoSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", JoopoPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", JoopoContactsCommand.Search.rawValue)
    assertEquals("contacts.add", JoopoContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", JoopoCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", JoopoCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", JoopoMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", JoopoMotionCommand.Pedometer.rawValue)
  }

  @Test
  fun smsCommandsUseStableStrings() {
    assertEquals("sms.send", JoopoSmsCommand.Send.rawValue)
    assertEquals("sms.search", JoopoSmsCommand.Search.rawValue)
  }

  @Test
  fun talkCommandsUseStableStrings() {
    assertEquals("talk.ptt.start", JoopoTalkCommand.PttStart.rawValue)
    assertEquals("talk.ptt.stop", JoopoTalkCommand.PttStop.rawValue)
    assertEquals("talk.ptt.cancel", JoopoTalkCommand.PttCancel.rawValue)
    assertEquals("talk.ptt.once", JoopoTalkCommand.PttOnce.rawValue)
  }

  @Test
  fun callLogCommandsUseStableStrings() {
    assertEquals("callLog.search", JoopoCallLogCommand.Search.rawValue)
  }
}
