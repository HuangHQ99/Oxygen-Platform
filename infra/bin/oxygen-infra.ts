#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { OxygenBudgetStack } from "../lib/oxygen-budget-stack.js";
import { OxygenPreprodStack } from "../lib/oxygen-preprod-stack.js";

const app = new cdk.App();

new OxygenPreprodStack(app, "OxygenPreprod", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-5",
  },
  description: "Oxygen low-cost pre-production foundation in Malaysia",
});

new OxygenBudgetStack(app, "OxygenBudget", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  description: "Oxygen global monthly cost guardrail",
});
