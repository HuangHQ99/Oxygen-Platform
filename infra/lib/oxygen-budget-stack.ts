import * as cdk from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";

/** Global billing guardrail. AWS Budgets CloudFormation is deployed from us-east-1. */
export class OxygenBudgetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const alertEmail = new cdk.CfnParameter(this, "BudgetAlertEmail", {
      type: "String",
      description: "Email address that receives AWS monthly cost alerts",
      allowedPattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
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
  }
}
