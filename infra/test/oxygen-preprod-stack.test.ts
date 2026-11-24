import assert from "node:assert/strict";
import { test } from "node:test";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { OxygenPreprodStack } from "../lib/oxygen-preprod-stack.js";

test("pre-production stack has identity, HTTPS entry, runtime and cost guardrails", () => {
  const app = new cdk.App();
  const stack = new OxygenPreprodStack(app, "TestStack", {
    env: { account: "111111111111", region: "ap-southeast-5" },
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::EC2::Instance", 1);
  template.resourceCountIs("AWS::CloudFront::Distribution", 1);
  template.resourceCountIs("AWS::Cognito::UserPool", 1);
  template.resourceCountIs("AWS::Cognito::UserPoolClient", 1);
  template.resourceCountIs("AWS::ECR::Repository", 2);
  template.hasResourceProperties("AWS::Budgets::Budget", {
    Budget: Match.objectLike({
      BudgetLimit: { Amount: 20, Unit: "USD" },
      TimeUnit: "MONTHLY",
    }),
  });

  const json = template.toJSON();
  const instances = Object.values(json.Resources).filter(
    (resource) => (resource as { Type?: string }).Type === "AWS::EC2::Instance",
  );
  assert.equal(instances.length, 1);
});
