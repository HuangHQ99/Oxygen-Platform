#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { OxygenPreprodStack } from "../lib/oxygen-preprod-stack.js";

const app = new cdk.App();

new OxygenPreprodStack(app, "OxygenPreprod", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-5",
  },
  description: "Oxygen low-cost pre-production foundation in Malaysia",
});
