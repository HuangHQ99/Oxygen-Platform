import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { OxygenBudgetStack } from "../lib/oxygen-budget-stack.js";
import { OxygenPreprodStack } from "../lib/oxygen-preprod-stack.js";

test("pre-production stack has identity, HTTPS entry and runtime safeguards", () => {
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
  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::Cognito::UserPoolDomain", 1);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketEncryption: Match.anyValue(),
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    VersioningConfiguration: { Status: "Enabled" },
  });
});

test("global budget stack has the approved monthly guardrail", () => {
  const app = new cdk.App();
  const stack = new OxygenBudgetStack(app, "BudgetTestStack", {
    env: { account: "111111111111", region: "us-east-1" },
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Budgets::Budget", {
    Budget: Match.objectLike({
      BudgetLimit: { Amount: 20, Unit: "USD" },
      TimeUnit: "MONTHLY",
    }),
  });
});

test("pre-production runtime stays single-node", () => {
  const app = new cdk.App();
  const stack = new OxygenPreprodStack(app, "RuntimeTestStack", {
    env: { account: "111111111111", region: "ap-southeast-5" },
  });
  const template = Template.fromStack(stack);
  const json = template.toJSON();
  const instances = Object.values(json.Resources).filter(
    (resource) => (resource as { Type?: string }).Type === "AWS::EC2::Instance",
  );
  assert.equal(instances.length, 1);
});

test("runtime containers expose the DNS aliases used by application configuration", () => {
  const deployScript = readFileSync(
    new URL("../../runtime/deploy.sh", import.meta.url),
    "utf8",
  );

  assert.match(deployScript, /--network oxygen --network-alias postgres/);
  assert.match(deployScript, /--network oxygen --network-alias api/);
  assert.match(
    deployScript,
    /docker network connect --alias postgres oxygen oxygen-postgres/,
  );
});
