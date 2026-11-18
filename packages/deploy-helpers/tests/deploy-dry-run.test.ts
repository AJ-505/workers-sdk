import { defaultWranglerConfig } from "@cloudflare/workers-utils";
import { beforeEach, describe, it, vi } from "vitest";
import deploy from "../src/deploy/deploy";
import { confirmLatestDeploymentOverwriteAndGetLatest } from "../src/deploy/helpers/confirm-latest-deployment-overwrite";
import { initDeployHelpersContext } from "../src/shared/context";
import type {
	ContainerlessConfig,
	DeployProps,
	WorkerBuildResult,
} from "../src/shared/types";
import type { FetchResultFetcher } from "@cloudflare/workers-utils";

vi.mock("../src/deploy/helpers/confirm-latest-deployment-overwrite", () => ({
	confirmLatestDeploymentOverwriteAndGetLatest: vi.fn(async () => ({
		confirmed: true,
		latestDeployment: undefined,
	})),
}));

vi.mock("../src/deploy/helpers/container-metadata", () => ({
	getContainerMetadata: () => [],
	getContainerMetadataForRolloutSkip: () => undefined,
}));

vi.mock("../src/deploy/helpers/durable-object-container-applications", () => ({
	deployDurableObjectContainerApplications: async () => {},
	prepareDurableObjectContainerApplications: async () => ({}),
}));

vi.mock("../src/deploy/helpers/exports", () => ({
	resolveExportsUploadPayload: async () => ({
		exports: undefined,
		migrations: undefined,
	}),
}));

vi.mock("../src/deploy/helpers/validate-worker-props", () => ({
	preUploadApiChecks: async () => ({
		aborted: false,
		tags: [],
		workerExists: false,
		workerTag: null,
	}),
	validateWorkerProps: (props: DeployProps) => ({
		...props,
		name: props.name ?? "worker",
	}),
}));

vi.mock("../src/triggers/deploy", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/triggers/deploy")>()),
	triggersDeploy: async () => [],
}));

describe("deploy dry run", () => {
	const fetchResult = vi.fn(async () => ({})) as unknown as FetchResultFetcher;

	beforeEach(() => {
		vi.clearAllMocks();
		initDeployHelpersContext({
			confirm: vi.fn(),
			fetchKVGetValue: vi.fn(),
			fetchListResult: vi.fn(),
			fetchPagedListResult: vi.fn(),
			fetchResult,
			logger: {
				debug: vi.fn(),
				error: vi.fn(),
				info: vi.fn(),
				log: vi.fn(),
				warn: vi.fn(),
			} as never,
			prompt: vi.fn(),
			select: vi.fn(),
		});
	});

	it("does not check for a latest deployment", async ({ expect }) => {
		const { containers: _containers, ...config } = {
			...defaultWranglerConfig,
			dependencies_instrumentation: { enabled: false },
			name: "worker",
		};
		const props = {
			accountId: "account",
			assetsDir: undefined,
			cliVars: {},
			command: "deploy",
			compatibilityDate: "2026-09-24",
			compatibilityFlags: [],
			containers: {
				durableObjects: { builtImages: [] },
				source: undefined,
				standard: { builtImages: [], normalized: [] },
			},
			containersRollout: undefined,
			dispatchNamespace: undefined,
			dryRun: true,
			entry: {
				configPath: undefined,
				file: "index.js",
				format: "modules",
				moduleRoot: ".",
				projectRoot: ".",
				exports: [],
			},
			env: undefined,
			experimentalAutoCreate: false,
			isWorkersSite: false,
			keepVars: false,
			legacyAssetPaths: undefined,
			logpush: undefined,
			main: "index.js",
			message: undefined,
			name: "worker",
			oldAssetTtl: undefined,
			outfile: undefined,
			resourcesProvision: false,
			routes: [],
			secretsFile: undefined,
			sendMetrics: false,
			skipProvisioningConfigWriteback: false,
			strict: false,
			tag: undefined,
			triggers: undefined,
		} satisfies DeployProps;
		const buildResult = {
			bundleType: "esm",
			content: "export default {}",
			dependencies: {},
			modules: [],
			resolvedEntryPointPath: "index.js",
			sourceMaps: undefined,
		} satisfies WorkerBuildResult;

		await deploy(props, config as ContainerlessConfig, buildResult, {
			deployCommand: "test-cli deploy",
			versionsDeployCommand: "test-cli versions deploy",
			d1ListCommand: "test-cli d1 list",
			d1DeleteCommand: "test-cli d1 delete <database-id>",
			queueCreateCommand: (queueName) => `test-cli queue create ${queueName}`,
			secretPutCommand: "test-cli secret put",
			workersDevConfigFieldName: "workersDev",
			workersDevConfigAssignment: (value) => `workersDev: ${value}`,
			previewUrlsConfigFieldName: "previewUrls",
			previewUrlsConfigAssignment: (value) => `previewUrls: ${value}`,
			configFileName: "test config",
			observabilityTargetPercentageField: "targetInstancePercentage",
			observabilityTargetCountField: "targetInstanceCount",
			syncWorkersSite: undefined,
		});

		expect(confirmLatestDeploymentOverwriteAndGetLatest).not.toHaveBeenCalled();
		expect(fetchResult).not.toHaveBeenCalled();
	});
});
