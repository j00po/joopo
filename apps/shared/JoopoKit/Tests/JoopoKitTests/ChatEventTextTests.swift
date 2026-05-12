import JoopoKit
import Testing
@testable import JoopoChatUI

struct ChatEventTextTests {
    @Test func `extracts assistant text from final chat event message`() {
        let event = JoopoChatEventPayload(
            runId: "run-1",
            sessionKey: "main",
            state: "final",
            message: AnyCodable([
                "role": "assistant",
                "content": [
                    ["type": "text", "text": "hello"],
                    ["type": "text", "text": "world"],
                ],
            ]),
            errorMessage: nil)

        #expect(JoopoChatEventText.assistantText(from: event) == "hello\nworld")
    }

    @Test func `ignores user messages`() {
        let event = JoopoChatEventPayload(
            runId: "run-1",
            sessionKey: "main",
            state: "delta",
            message: AnyCodable([
                "role": "user",
                "content": [["type": "text", "text": "ignore me"]],
            ]),
            errorMessage: nil)

        #expect(JoopoChatEventText.assistantText(from: event) == nil)
    }

    @Test func `extracts plain string content`() {
        let event = JoopoChatEventPayload(
            runId: "run-1",
            sessionKey: "main",
            state: "final",
            message: AnyCodable([
                "role": "assistant",
                "content": "plain reply",
            ]),
            errorMessage: nil)

        #expect(JoopoChatEventText.assistantText(from: event) == "plain reply")
    }
}
