import type { JoopoConfig } from "../config/types.joopo.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { JoopoPluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: JoopoPluginApi["registrationMode"];
  config: JoopoConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      JoopoPluginApi,
      | "registerTool"
      | "registerHook"
      | "registerHttpRoute"
      | "registerHostedMediaResolver"
      | "registerChannel"
      | "registerGatewayMethod"
      | "registerCli"
      | "registerReload"
      | "registerNodeHostCommand"
      | "registerNodeInvokePolicy"
      | "registerSecurityAuditCollector"
      | "registerService"
      | "registerGatewayDiscoveryService"
      | "registerCliBackend"
      | "registerTextTransforms"
      | "registerConfigMigration"
      | "registerMigrationProvider"
      | "registerAutoEnableProbe"
      | "registerProvider"
      | "registerSpeechProvider"
      | "registerRealtimeTranscriptionProvider"
      | "registerRealtimeVoiceProvider"
      | "registerMediaUnderstandingProvider"
      | "registerImageGenerationProvider"
      | "registerVideoGenerationProvider"
      | "registerMusicGenerationProvider"
      | "registerWebFetchProvider"
      | "registerWebSearchProvider"
      | "registerInteractiveHandler"
      | "onConversationBindingResolved"
      | "registerCommand"
      | "registerContextEngine"
      | "registerCompactionProvider"
      | "registerAgentHarness"
      | "registerCodexAppServerExtensionFactory"
      | "registerAgentToolResultMiddleware"
      | "registerSessionExtension"
      | "enqueueNextTurnInjection"
      | "registerTrustedToolPolicy"
      | "registerToolMetadata"
      | "registerControlUiDescriptor"
      | "registerRuntimeLifecycle"
      | "registerAgentEventSubscription"
      | "setRunContext"
      | "getRunContext"
      | "clearRunContext"
      | "registerSessionSchedulerJob"
      | "registerDetachedTaskRuntime"
      | "registerMemoryCapability"
      | "registerMemoryPromptSection"
      | "registerMemoryPromptSupplement"
      | "registerMemoryCorpusSupplement"
      | "registerMemoryFlushPlan"
      | "registerMemoryRuntime"
      | "registerMemoryEmbeddingProvider"
      | "on"
    >
  >;
};

const noopRegisterTool: JoopoPluginApi["registerTool"] = () => {};
const noopRegisterHook: JoopoPluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: JoopoPluginApi["registerHttpRoute"] = () => {};
const noopRegisterHostedMediaResolver: JoopoPluginApi["registerHostedMediaResolver"] = () => {};
const noopRegisterChannel: JoopoPluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: JoopoPluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: JoopoPluginApi["registerCli"] = () => {};
const noopRegisterReload: JoopoPluginApi["registerReload"] = () => {};
const noopRegisterNodeHostCommand: JoopoPluginApi["registerNodeHostCommand"] = () => {};
const noopRegisterNodeInvokePolicy: JoopoPluginApi["registerNodeInvokePolicy"] = () => {};
const noopRegisterSecurityAuditCollector: JoopoPluginApi["registerSecurityAuditCollector"] =
  () => {};
const noopRegisterService: JoopoPluginApi["registerService"] = () => {};
const noopRegisterGatewayDiscoveryService: JoopoPluginApi["registerGatewayDiscoveryService"] =
  () => {};
const noopRegisterCliBackend: JoopoPluginApi["registerCliBackend"] = () => {};
const noopRegisterTextTransforms: JoopoPluginApi["registerTextTransforms"] = () => {};
const noopRegisterConfigMigration: JoopoPluginApi["registerConfigMigration"] = () => {};
const noopRegisterMigrationProvider: JoopoPluginApi["registerMigrationProvider"] = () => {};
const noopRegisterAutoEnableProbe: JoopoPluginApi["registerAutoEnableProbe"] = () => {};
const noopRegisterProvider: JoopoPluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: JoopoPluginApi["registerSpeechProvider"] = () => {};
const noopRegisterRealtimeTranscriptionProvider: JoopoPluginApi["registerRealtimeTranscriptionProvider"] =
  () => {};
const noopRegisterRealtimeVoiceProvider: JoopoPluginApi["registerRealtimeVoiceProvider"] =
  () => {};
const noopRegisterMediaUnderstandingProvider: JoopoPluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: JoopoPluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterVideoGenerationProvider: JoopoPluginApi["registerVideoGenerationProvider"] =
  () => {};
const noopRegisterMusicGenerationProvider: JoopoPluginApi["registerMusicGenerationProvider"] =
  () => {};
const noopRegisterWebFetchProvider: JoopoPluginApi["registerWebFetchProvider"] = () => {};
const noopRegisterWebSearchProvider: JoopoPluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: JoopoPluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: JoopoPluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: JoopoPluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: JoopoPluginApi["registerContextEngine"] = () => {};
const noopRegisterCompactionProvider: JoopoPluginApi["registerCompactionProvider"] = () => {};
const noopRegisterAgentHarness: JoopoPluginApi["registerAgentHarness"] = () => {};
const noopRegisterCodexAppServerExtensionFactory: JoopoPluginApi["registerCodexAppServerExtensionFactory"] =
  () => {};
const noopRegisterAgentToolResultMiddleware: JoopoPluginApi["registerAgentToolResultMiddleware"] =
  () => {};
const noopRegisterSessionExtension: JoopoPluginApi["registerSessionExtension"] = () => {};
const noopEnqueueNextTurnInjection: JoopoPluginApi["enqueueNextTurnInjection"] = async (
  injection,
) => ({ enqueued: false, id: "", sessionKey: injection.sessionKey });
const noopRegisterTrustedToolPolicy: JoopoPluginApi["registerTrustedToolPolicy"] = () => {};
const noopRegisterToolMetadata: JoopoPluginApi["registerToolMetadata"] = () => {};
const noopRegisterControlUiDescriptor: JoopoPluginApi["registerControlUiDescriptor"] = () => {};
const noopRegisterRuntimeLifecycle: JoopoPluginApi["registerRuntimeLifecycle"] = () => {};
const noopRegisterAgentEventSubscription: JoopoPluginApi["registerAgentEventSubscription"] =
  () => {};
const noopSetRunContext: JoopoPluginApi["setRunContext"] = () => false;
const noopGetRunContext: JoopoPluginApi["getRunContext"] = () => undefined;
const noopClearRunContext: JoopoPluginApi["clearRunContext"] = () => {};
const noopRegisterSessionSchedulerJob: JoopoPluginApi["registerSessionSchedulerJob"] = () =>
  undefined;
const noopRegisterDetachedTaskRuntime: JoopoPluginApi["registerDetachedTaskRuntime"] = () => {};
const noopRegisterMemoryCapability: JoopoPluginApi["registerMemoryCapability"] = () => {};
const noopRegisterMemoryPromptSection: JoopoPluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryPromptSupplement: JoopoPluginApi["registerMemoryPromptSupplement"] =
  () => {};
const noopRegisterMemoryCorpusSupplement: JoopoPluginApi["registerMemoryCorpusSupplement"] =
  () => {};
const noopRegisterMemoryFlushPlan: JoopoPluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: JoopoPluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: JoopoPluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: JoopoPluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): JoopoPluginApi {
  const handlers = params.handlers ?? {};
  const registerCli = handlers.registerCli ?? noopRegisterCli;
  return {
    id: params.id,
    name: params.name,
    version: params.version,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    registrationMode: params.registrationMode,
    config: params.config,
    pluginConfig: params.pluginConfig,
    runtime: params.runtime,
    logger: params.logger,
    registerTool: handlers.registerTool ?? noopRegisterTool,
    registerHook: handlers.registerHook ?? noopRegisterHook,
    registerHttpRoute: handlers.registerHttpRoute ?? noopRegisterHttpRoute,
    registerHostedMediaResolver:
      handlers.registerHostedMediaResolver ?? noopRegisterHostedMediaResolver,
    registerChannel: handlers.registerChannel ?? noopRegisterChannel,
    registerGatewayMethod: handlers.registerGatewayMethod ?? noopRegisterGatewayMethod,
    registerCli,
    registerNodeCliFeature: (registrar, opts) =>
      registerCli(registrar, {
        ...opts,
        parentPath: ["nodes"],
      }),
    registerReload: handlers.registerReload ?? noopRegisterReload,
    registerNodeHostCommand: handlers.registerNodeHostCommand ?? noopRegisterNodeHostCommand,
    registerNodeInvokePolicy: handlers.registerNodeInvokePolicy ?? noopRegisterNodeInvokePolicy,
    registerSecurityAuditCollector:
      handlers.registerSecurityAuditCollector ?? noopRegisterSecurityAuditCollector,
    registerService: handlers.registerService ?? noopRegisterService,
    registerGatewayDiscoveryService:
      handlers.registerGatewayDiscoveryService ?? noopRegisterGatewayDiscoveryService,
    registerCliBackend: handlers.registerCliBackend ?? noopRegisterCliBackend,
    registerTextTransforms: handlers.registerTextTransforms ?? noopRegisterTextTransforms,
    registerConfigMigration: handlers.registerConfigMigration ?? noopRegisterConfigMigration,
    registerMigrationProvider: handlers.registerMigrationProvider ?? noopRegisterMigrationProvider,
    registerAutoEnableProbe: handlers.registerAutoEnableProbe ?? noopRegisterAutoEnableProbe,
    registerProvider: handlers.registerProvider ?? noopRegisterProvider,
    registerSpeechProvider: handlers.registerSpeechProvider ?? noopRegisterSpeechProvider,
    registerRealtimeTranscriptionProvider:
      handlers.registerRealtimeTranscriptionProvider ?? noopRegisterRealtimeTranscriptionProvider,
    registerRealtimeVoiceProvider:
      handlers.registerRealtimeVoiceProvider ?? noopRegisterRealtimeVoiceProvider,
    registerMediaUnderstandingProvider:
      handlers.registerMediaUnderstandingProvider ?? noopRegisterMediaUnderstandingProvider,
    registerImageGenerationProvider:
      handlers.registerImageGenerationProvider ?? noopRegisterImageGenerationProvider,
    registerVideoGenerationProvider:
      handlers.registerVideoGenerationProvider ?? noopRegisterVideoGenerationProvider,
    registerMusicGenerationProvider:
      handlers.registerMusicGenerationProvider ?? noopRegisterMusicGenerationProvider,
    registerWebFetchProvider: handlers.registerWebFetchProvider ?? noopRegisterWebFetchProvider,
    registerWebSearchProvider: handlers.registerWebSearchProvider ?? noopRegisterWebSearchProvider,
    registerInteractiveHandler:
      handlers.registerInteractiveHandler ?? noopRegisterInteractiveHandler,
    onConversationBindingResolved:
      handlers.onConversationBindingResolved ?? noopOnConversationBindingResolved,
    registerCommand: handlers.registerCommand ?? noopRegisterCommand,
    registerContextEngine: handlers.registerContextEngine ?? noopRegisterContextEngine,
    registerCompactionProvider:
      handlers.registerCompactionProvider ?? noopRegisterCompactionProvider,
    registerAgentHarness: handlers.registerAgentHarness ?? noopRegisterAgentHarness,
    registerCodexAppServerExtensionFactory:
      handlers.registerCodexAppServerExtensionFactory ?? noopRegisterCodexAppServerExtensionFactory,
    registerAgentToolResultMiddleware:
      handlers.registerAgentToolResultMiddleware ?? noopRegisterAgentToolResultMiddleware,
    registerSessionExtension: handlers.registerSessionExtension ?? noopRegisterSessionExtension,
    enqueueNextTurnInjection: handlers.enqueueNextTurnInjection ?? noopEnqueueNextTurnInjection,
    registerTrustedToolPolicy: handlers.registerTrustedToolPolicy ?? noopRegisterTrustedToolPolicy,
    registerToolMetadata: handlers.registerToolMetadata ?? noopRegisterToolMetadata,
    registerControlUiDescriptor:
      handlers.registerControlUiDescriptor ?? noopRegisterControlUiDescriptor,
    registerRuntimeLifecycle: handlers.registerRuntimeLifecycle ?? noopRegisterRuntimeLifecycle,
    registerAgentEventSubscription:
      handlers.registerAgentEventSubscription ?? noopRegisterAgentEventSubscription,
    setRunContext: handlers.setRunContext ?? noopSetRunContext,
    getRunContext: handlers.getRunContext ?? noopGetRunContext,
    clearRunContext: handlers.clearRunContext ?? noopClearRunContext,
    registerSessionSchedulerJob:
      handlers.registerSessionSchedulerJob ?? noopRegisterSessionSchedulerJob,
    registerDetachedTaskRuntime:
      handlers.registerDetachedTaskRuntime ?? noopRegisterDetachedTaskRuntime,
    registerMemoryCapability: handlers.registerMemoryCapability ?? noopRegisterMemoryCapability,
    registerMemoryPromptSection:
      handlers.registerMemoryPromptSection ?? noopRegisterMemoryPromptSection,
    registerMemoryPromptSupplement:
      handlers.registerMemoryPromptSupplement ?? noopRegisterMemoryPromptSupplement,
    registerMemoryCorpusSupplement:
      handlers.registerMemoryCorpusSupplement ?? noopRegisterMemoryCorpusSupplement,
    registerMemoryFlushPlan: handlers.registerMemoryFlushPlan ?? noopRegisterMemoryFlushPlan,
    registerMemoryRuntime: handlers.registerMemoryRuntime ?? noopRegisterMemoryRuntime,
    registerMemoryEmbeddingProvider:
      handlers.registerMemoryEmbeddingProvider ?? noopRegisterMemoryEmbeddingProvider,
    resolvePath: params.resolvePath,
    on: handlers.on ?? noopOn,
  };
}
