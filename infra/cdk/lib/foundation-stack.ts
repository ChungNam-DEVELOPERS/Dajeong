import {
  CfnOutput,
  Stack,
  Tags,
  type StackProps,
} from "aws-cdk-lib";
import {
  IpAddresses,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import {
  getEnvironmentConfig,
  resourceName,
  resourceTags,
  type DeploymentEnvironment,
} from "./environment.ts";

export interface DajeongFoundationStackProps extends StackProps {
  readonly environmentName: DeploymentEnvironment;
}

export class DajeongFoundationStack extends Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: DajeongFoundationStackProps,
  ) {
    super(scope, id, props);

    const config = getEnvironmentConfig(props.environmentName);

    for (const [key, value] of Object.entries(
      resourceTags(props.environmentName),
    )) {
      Tags.of(this).add(key, value);
    }

    const vpc = new Vpc(this, "Vpc", {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      ipAddresses: IpAddresses.cidr(config.vpcCidr),
      maxAzs: 2,
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "data",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
      vpcName: resourceName(props.environmentName, "vpc"),
    });

    new CfnOutput(this, "VpcId", {
      description: "Dajeong foundation VPC ID",
      value: vpc.vpcId,
    });

    new CfnOutput(this, "PublicSubnetIds", {
      description: "Comma-separated public subnet IDs",
      value: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(","),
    });

    new CfnOutput(this, "DataSubnetIds", {
      description: "Comma-separated isolated data subnet IDs",
      value: vpc.isolatedSubnets.map((subnet) => subnet.subnetId).join(","),
    });
  }
}
