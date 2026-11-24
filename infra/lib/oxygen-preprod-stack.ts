import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
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
        ec2.InstanceSize.SMALL,
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
      "dnf install -y docker nginx",
      "systemctl enable --now docker",
      "mkdir -p /opt/oxygen/postgres",
      "chmod 700 /opt/oxygen/postgres",
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
    );

    const elasticIp = new ec2.CfnEIP(this, "RuntimeIp", { domain: "vpc" });
    new ec2.CfnEIPAssociation(this, "RuntimeIpAssociation", {
      allocationId: elasticIp.attrAllocationId,
      instanceId: instance.instanceId,
    });

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
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });

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
  }
}
