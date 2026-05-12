import Testing
@testable import Joopo

@Suite(.serialized) struct JoopoAppDelegateTests {
    @Test @MainActor func resolvesRegistryModelBeforeViewTaskAssignsDelegateModel() {
        let registryModel = NodeAppModel()
        JoopoAppModelRegistry.appModel = registryModel
        defer { JoopoAppModelRegistry.appModel = nil }

        let delegate = JoopoAppDelegate()

        #expect(delegate._test_resolvedAppModel() === registryModel)
    }

    @Test @MainActor func prefersExplicitDelegateModelOverRegistryFallback() {
        let registryModel = NodeAppModel()
        let explicitModel = NodeAppModel()
        JoopoAppModelRegistry.appModel = registryModel
        defer { JoopoAppModelRegistry.appModel = nil }

        let delegate = JoopoAppDelegate()
        delegate.appModel = explicitModel

        #expect(delegate._test_resolvedAppModel() === explicitModel)
    }
}
