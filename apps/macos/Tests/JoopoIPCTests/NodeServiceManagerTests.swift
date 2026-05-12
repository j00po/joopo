import Foundation
import Testing
@testable import Joopo

@Suite(.serialized) struct NodeServiceManagerTests {
    @Test func `builds node service commands with current CLI shape`() async throws {
        try await TestIsolation.withUserDefaultsValues(["joopo.gatewayProjectRootPath": nil]) {
            let tmp = try makeTempDirForTests()
            CommandResolver.setProjectRoot(tmp.path)

            let joopoPath = tmp.appendingPathComponent("node_modules/.bin/joopo")
            try makeExecutableForTests(at: joopoPath)

            let start = NodeServiceManager._testServiceCommand(["start"])
            #expect(start == [joopoPath.path, "node", "start", "--json"])

            let stop = NodeServiceManager._testServiceCommand(["stop"])
            #expect(stop == [joopoPath.path, "node", "stop", "--json"])
        }
    }
}
