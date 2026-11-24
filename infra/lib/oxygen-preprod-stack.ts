import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as assets from "aws-cdk-lib/aws-s3-assets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as path from "node:path";
import { Construct } from "constructs";

/** Low-cost, single-node pre-production stack. It is deliberately not a production HA design. */
export class OxygenPreprodStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const alertEmail = new cdk.CfnParameter(this, "BudgetAlertEmail", {
      type: "String",
      description: "Email address that receives AWS monthly cost alerts",
      allowedPattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
    });
    const originVerifyToken = new cdk.CfnParameter(this, "OriginVerifyToken", {
      type: "String",
      noEcho: true,
      minLength: 32,
      description:
        "Random token used by nginx to reject requests that bypass CloudFront",
    });
    const cognitoDomainPrefix = new cdk.CfnParameter(
      this,
      "CognitoDomainPrefix",
      {
        type: "String",
        minLength: 1,
        maxLength: 63,
        allowedPattern: "^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$",
        description:
          "Globally unique prefix for the Cognito hosted login domain",
      },
    );

    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.24.0.0/24"),
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, "RuntimeSecurityGroup", {
      vpc,
      description: "CloudFront-to-Oxygen origin only; no SSH ingress",
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "CloudFront HTTP origin",
    );

    const runtimeRole = new iam.Role(this, "RuntimeRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });

    const webRepository = new ecr.Repository(this, "WebRepository", {
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const apiRepository = new ecr.Repository(this, "ApiRepository", {
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    webRepository.grantPull(runtimeRole);
    apiRepository.grantPull(runtimeRole);

    const databaseSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "oxygen" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
    databaseSecret.grantRead(runtimeRole);

    const backupBucket = new s3.Bucket(this, "BackupBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: "expire-preprod-backups",
          expiration: cdk.Duration.days(35),
          noncurrentVersionExpiration: cdk.Duration.days(7),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    runtimeRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [backupBucket.arnForObjects("postgres/*")],
      }),
    );
    runtimeRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [backupBucket.bucketArn],
        conditions: { StringLike: { "s3:prefix": ["postgres/*"] } },
      }),
    );

    const runtimeAsset = new assets.Asset(this, "RuntimeAsset", {
      path: path.join(process.cwd(), "runtime"),
    });
    runtimeAsset.grantRead(runtimeRole);

    const machineImage = ec2.MachineImage.latestAmazonLinux2023({
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });
    const instance = new ec2.Instance(this, "Runtime", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup,
      role: runtimeRole,
      machineImage,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });
    instance.userData.addCommands(
      "dnf install -y docker nginx jq unzip",
      "fallocate -l 2G /swapfile",
      "chmod 600 /swapfile",
      "mkswap /swapfile",
      "swapon /swapfile",
      "echo '/swapfile none swap sw 0 0' >> /etc/fstab",
      "systemctl enable --now docker",
      "mkdir -p /opt/oxygen/postgres",
      "chmod 700 /opt/oxygen/postgres",
      `aws s3 cp s3://${runtimeAsset.s3BucketName}/${runtimeAsset.s3ObjectKey} /tmp/oxygen-runtime.zip --region ${this.region}`,
      "mkdir -p /opt/oxygen/runtime",
      "unzip -o /tmp/oxygen-runtime.zip -d /opt/oxygen/runtime",
      "chmod 700 /opt/oxygen/runtime/*.sh",
      "cp /opt/oxygen/runtime/oxygen-runtime.service /etc/systemd/system/",
      "cp /opt/oxygen/runtime/oxygen-backup.service /etc/systemd/system/",
      "cp /opt/oxygen/runtime/oxygen-backup.timer /etc/systemd/system/",
      "cat > /opt/oxygen/stack.env <<'ENV'",
      `AWS_REGION=${this.region}`,
      `OXYGEN_API_REPOSITORY=${apiRepository.repositoryUri}`,
      `OXYGEN_WEB_REPOSITORY=${webRepository.repositoryUri}`,
      `OXYGEN_DATABASE_SECRET_ARN=${databaseSecret.secretArn}`,
      `OXYGEN_BACKUP_BUCKET=${backupBucket.bucketName}`,
      "OXYGEN_IMAGE_TAG=stable",
      "ENV",
      "chmod 600 /opt/oxygen/stack.env",
      "cat > /etc/nginx/conf.d/oxygen.conf <<'NGINX'",
      "server {",
      "  listen 80 default_server;",
      "  if ($http_x_oxygen_origin_verify != '" +
        originVerifyToken.valueAsString +
        "') { return 403; }",
      "  location / { proxy_pass http://127.0.0.1:8081; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; }",
      "}",
      "NGINX",
      "rm -f /etc/nginx/conf.d/default.conf",
      "systemctl enable --now nginx",
      "systemctl daemon-reload",
      "systemctl enable oxygen-runtime.service oxygen-backup.timer",
      "systemctl start oxygen-backup.timer",
    );

    const elasticIp = new ec2.CfnEIP(this, "RuntimeIp", { domain: "vpc" });
    const elasticIpAssociation = new ec2.CfnEIPAssociation(
      this,
      "RuntimeIpAssociation",
      {
        allocationId: elasticIp.attrAllocationId,
        instanceId: instance.instanceId,
      },
    );

    const distribution = new cloudfront.Distribution(this, "Entry", {
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin: new origins.HttpOrigin(instance.instancePublicDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          httpPort: 80,
          customHeaders: {
            "X-Oxygen-Origin-Verify": originVerifyToken.valueAsString,
          },
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
    });
    distribution.node.addDependency(elasticIpAssociation);

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "oxygen-web",
      generateSecret: true,
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          `https://${distribution.distributionDomainName}/login/oauth2/code/cognito`,
        ],
        logoutUrls: [`https://${distribution.distributionDomainName}/`],
      },
      preventUserExistenceErrors: true,
    });
    userPool.addDomain("HostedLoginDomain", {
      cognitoDomain: { domainPrefix: cognitoDomainPrefix.valueAsString },
    });
    runtimeRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:ListUserPoolClients",
        ],
        resources: [userPool.userPoolArn],
      }),
    );
    instance.userData.addCommands(
      `printf '\nOXYGEN_USER_POOL_ID=${userPool.userPoolId}\n' >> /opt/oxygen/stack.env`,
    );

    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetName: "oxygen-preprod-monthly",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: 20, unit: "USD" },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "FORECASTED",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            { address: alertEmail.valueAsString, subscriptionType: "EMAIL" },
          ],
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            { address: alertEmail.valueAsString, subscriptionType: "EMAIL" },
          ],
        },
      ],
    });

    new cdk.CfnOutput(this, "HostedEntry", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "WebRepositoryUri", {
      value: webRepository.repositoryUri,
    });
    new cdk.CfnOutput(this, "ApiRepositoryUri", {
      value: apiRepository.repositoryUri,
    });
    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: databaseSecret.secretArn,
    });
    new cdk.CfnOutput(this, "BackupBucketName", {
      value: backupBucket.bucketName,
    });
    new cdk.CfnOutput(this, "RuntimeInstanceId", {
      value: instance.instanceId,
    });
    new cdk.CfnOutput(this, "CognitoLoginDomain", {
      value: `https://${cognitoDomainPrefix.valueAsString}.auth.${this.region}.amazoncognito.com`,
    });
  }
}
