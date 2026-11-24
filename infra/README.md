# Oxygen infrastructure

W02-03 provisions a deliberately small AWS pre-production foundation in Malaysia
(`ap-southeast-5`). It contains Cognito hosted login, CloudFront, one `t4g.micro` Graviton node
with 2 GiB swap, encrypted EBS, two ECR repositories, a generated database secret, an encrypted
versioned S3 backup bucket and Systems Manager access. A separate global `OxygenBudget` stack in
`us-east-1` holds the AWS monthly budget because that CloudFormation resource is not available in
the Malaysia region. There is no NAT Gateway, load balancer or inbound SSH rule.

This is a single-node pre-production topology, not the production high-availability design. The
API, Web and PostgreSQL containers share the node. PostgreSQL data uses the encrypted EBS volume
and is dumped daily to S3 with a 35-day retention policy. This backup is a pre-production safeguard,
not a substitute for a managed multi-AZ database or a tested production disaster-recovery plan.

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
pnpm --filter @oxygen/infra cdk bootstrap aws://ACCOUNT_ID/us-east-1
pnpm --filter @oxygen/infra cdk deploy OxygenBudget \
  --parameters BudgetAlertEmail=OWNER_EMAIL
pnpm --filter @oxygen/infra cdk deploy OxygenPreprod \
  --parameters OriginVerifyToken=RANDOM_32_PLUS_CHARACTER_VALUE \
  --parameters CognitoDomainPrefix=GLOBALLY_UNIQUE_LOWERCASE_PREFIX
```

Do not put real values in the repository or shell history. Use the deployment environment's
secret injection. The origin token is sent only by CloudFront and checked by host nginx, so direct
requests to the public origin are rejected. Build both Dockerfiles for `linux/arm64`, push the same
immutable commit tag plus `stable` to the output ECR repositories, then run
`sudo systemctl restart oxygen-runtime` through Systems Manager. `deploy.sh TAG` performs a
readiness check and restores the previous application images when a new release fails.

Operational commands and the explicit restore procedure are documented in
`docs/W02-03预发布部署与恢复.md`.
