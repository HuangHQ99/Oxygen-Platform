# Oxygen infrastructure

W02-03 provisions a deliberately small AWS pre-production foundation in Malaysia
(`ap-southeast-5`). It contains Cognito, CloudFront, one Graviton EC2 node, encrypted EBS, two
ECR repositories, a generated database secret, Systems Manager access and an AWS monthly budget.
There is no NAT Gateway, load balancer or inbound SSH rule.

This is a single-node pre-production topology, not the production high-availability design. The
API, Web and PostgreSQL containers share the node. PostgreSQL data uses the encrypted EBS volume;
backup/restore and managed-database migration must be completed before production.

## Verify without creating resources

```bash
pnpm --filter @oxygen/infra typecheck
pnpm --filter @oxygen/infra test
pnpm --filter @oxygen/infra synth
```

`synth` is offline and does not create billable resources. Deployment requires an AWS account,
an alert email and a random origin token of at least 32 characters:

```bash
export CDK_DEFAULT_REGION=ap-southeast-5
pnpm --filter @oxygen/infra cdk bootstrap aws://ACCOUNT_ID/ap-southeast-5
pnpm --filter @oxygen/infra cdk deploy OxygenPreprod \
  --parameters BudgetAlertEmail=OWNER_EMAIL \
  --parameters OriginVerifyToken=RANDOM_32_PLUS_CHARACTER_VALUE
```

Do not put real values in the repository or shell history. Use the deployment environment's
secret injection. The origin token is sent only by CloudFront and checked by host nginx, so direct
requests to the public origin are rejected. Application images and the runtime start procedure are
the next deployment step after the account and budget are approved.
