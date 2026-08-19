import { App } from "aws-cdk-lib";
import {
  DAJEONG_REGION,
  getEnvironmentConfig,
  parseDeploymentEnvironment,
  resolveAwsAccount,
} from "../lib/environment.ts";
import { DajeongFoundationStack } from "../lib/foundation-stack.ts";

const app = new App();
const environment = parseDeploymentEnvironment(
  app.node.tryGetContext("environment"),
);
const config = getEnvironmentConfig(environment);

new DajeongFoundationStack(app, config.stackId, {
  env: {
    account: resolveAwsAccount(process.env.CDK_DEFAULT_ACCOUNT),
    region: DAJEONG_REGION,
  },
  environmentName: environment,
  stackName: config.stackName,
});

app.synth();
