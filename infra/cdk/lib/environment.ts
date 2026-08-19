export const DAJEONG_REGION = "ap-northeast-2";

export type DeploymentEnvironment = "staging" | "production";

interface EnvironmentConfig {
  readonly stackId: string;
  readonly stackName: string;
  readonly vpcCidr: string;
}

const ENVIRONMENT_CONFIG = {
  staging: {
    stackId: "DajeongStagingFoundation",
    stackName: "dajeong-staging-foundation",
    vpcCidr: "10.20.0.0/16",
  },
  production: {
    stackId: "DajeongProductionFoundation",
    stackName: "dajeong-production-foundation",
    vpcCidr: "10.30.0.0/16",
  },
} as const satisfies Record<DeploymentEnvironment, EnvironmentConfig>;

export function parseDeploymentEnvironment(
  value: unknown,
): DeploymentEnvironment {
  if (value === "staging" || value === "production") {
    return value;
  }

  throw new Error(
    'CDK context "environment" must be either "staging" or "production".',
  );
}

export function resolveAwsAccount(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }

  if (!/^\d{12}$/.test(value)) {
    throw new Error("CDK_DEFAULT_ACCOUNT must be a 12-digit AWS account ID.");
  }

  return value;
}

export function getEnvironmentConfig(
  environment: DeploymentEnvironment,
): EnvironmentConfig {
  return ENVIRONMENT_CONFIG[environment];
}

export function resourceName(
  environment: DeploymentEnvironment,
  purpose: string,
): string {
  return `dajeong-${environment}-${purpose}`;
}

export function resourceTags(
  environment: DeploymentEnvironment,
): Readonly<Record<string, string>> {
  return {
    Environment: environment,
    ManagedBy: "aws-cdk",
    Project: "dajeong",
    Repository: "ChungNam-DEVELOPERS/Dajeong",
  };
}
