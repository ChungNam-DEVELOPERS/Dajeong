import assert from "node:assert/strict";
import test from "node:test";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { DAJEONG_REGION, getEnvironmentConfig } from "../lib/environment.ts";
import { DajeongFoundationStack } from "../lib/foundation-stack.ts";

function synthesize(environment: "staging" | "production"): Template {
  const app = new App();
  const config = getEnvironmentConfig(environment);
  const stack = new DajeongFoundationStack(app, config.stackId, {
    env: {
      region: DAJEONG_REGION,
    },
    environmentName: environment,
    stackName: config.stackName,
  });

  return Template.fromStack(stack);
}

test("staging foundation synthesizes only the intended network resources", () => {
  const template = synthesize("staging");
  const resources = template.toJSON().Resources as Record<
    string,
    { readonly Type: string }
  >;
  const resourceTypes = Object.values(resources)
    .map((resource) => resource.Type)
    .sort();

  assert.deepEqual(resourceTypes, [
    "AWS::EC2::InternetGateway",
    "AWS::EC2::Route",
    "AWS::EC2::Route",
    "AWS::EC2::RouteTable",
    "AWS::EC2::RouteTable",
    "AWS::EC2::RouteTable",
    "AWS::EC2::RouteTable",
    "AWS::EC2::Subnet",
    "AWS::EC2::Subnet",
    "AWS::EC2::Subnet",
    "AWS::EC2::Subnet",
    "AWS::EC2::SubnetRouteTableAssociation",
    "AWS::EC2::SubnetRouteTableAssociation",
    "AWS::EC2::SubnetRouteTableAssociation",
    "AWS::EC2::SubnetRouteTableAssociation",
    "AWS::EC2::VPC",
    "AWS::EC2::VPCGatewayAttachment",
    "AWS::IAM::Role",
    "AWS::Lambda::Function",
    "Custom::VpcRestrictDefaultSG",
  ]);

  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::Subnet", 4);
  template.resourceCountIs("AWS::EC2::InternetGateway", 1);
  template.resourceCountIs("AWS::EC2::NatGateway", 0);
  template.resourceCountIs("AWS::EC2::EIP", 0);
  template.resourceCountIs("Custom::VpcRestrictDefaultSG", 1);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "10.20.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    Tags: Match.arrayWith([
      { Key: "Environment", Value: "staging" },
      { Key: "ManagedBy", Value: "aws-cdk" },
      { Key: "Name", Value: "dajeong-staging-vpc" },
      { Key: "Project", Value: "dajeong" },
      {
        Key: "Repository",
        Value: "ChungNam-DEVELOPERS/Dajeong",
      },
    ]),
  });
});

test("staging synthesis is deterministic", () => {
  assert.deepEqual(
    synthesize("staging").toJSON(),
    synthesize("staging").toJSON(),
  );
});

test("production foundation uses its own network range and tags", () => {
  const template = synthesize("production");

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "10.30.0.0/16",
    Tags: Match.arrayWith([
      { Key: "Environment", Value: "production" },
      { Key: "Name", Value: "dajeong-production-vpc" },
    ]),
  });
});
