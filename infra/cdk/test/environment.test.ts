import assert from "node:assert/strict";
import test from "node:test";
import {
  DAJEONG_REGION,
  getEnvironmentConfig,
  parseDeploymentEnvironment,
  resolveAwsAccount,
  resourceName,
  resourceTags,
} from "../lib/environment.ts";

test("staging and production use separate Seoul-region settings", () => {
  assert.equal(DAJEONG_REGION, "ap-northeast-2");
  assert.deepEqual(getEnvironmentConfig("staging"), {
    stackId: "DajeongStagingFoundation",
    stackName: "dajeong-staging-foundation",
    vpcCidr: "10.20.0.0/16",
  });
  assert.deepEqual(getEnvironmentConfig("production"), {
    stackId: "DajeongProductionFoundation",
    stackName: "dajeong-production-foundation",
    vpcCidr: "10.30.0.0/16",
  });
});

test("environment context rejects missing and unsupported values", () => {
  assert.equal(parseDeploymentEnvironment("staging"), "staging");
  assert.equal(parseDeploymentEnvironment("production"), "production");
  assert.throws(() => parseDeploymentEnvironment(undefined));
  assert.throws(() => parseDeploymentEnvironment("local"));
});

test("account context is optional for synth and validated when supplied", () => {
  assert.equal(resolveAwsAccount(undefined), undefined);
  assert.equal(resolveAwsAccount(""), undefined);
  assert.equal(resolveAwsAccount("123456789012"), "123456789012");
  assert.throws(() => resolveAwsAccount("1234"));
  assert.throws(() => resolveAwsAccount("abcdefghijkl"));
});

test("resource names and mandatory tags follow one convention", () => {
  assert.equal(resourceName("staging", "vpc"), "dajeong-staging-vpc");
  assert.deepEqual(resourceTags("production"), {
    Environment: "production",
    ManagedBy: "aws-cdk",
    Project: "dajeong",
    Repository: "ChungNam-DEVELOPERS/Dajeong",
  });
});
