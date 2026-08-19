import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLICATION_REGION,
  classifyCallerArn,
  collectReadiness,
  evaluateReadiness,
  formatReadinessReport,
  inspectBudgets,
  parseProfileArgument,
} from "./check-aws-account.mjs";

const assumedRoleArn =
  "arn:aws:sts::account-placeholder:assumed-role/Developer/session";

test("profile 인자와 환경 변수 우선순위를 해석한다", () => {
  assert.equal(
    parseProfileArgument(["--", "--profile", "staging"], {
      DAJEONG_AWS_PROFILE: "environment",
    }),
    "staging",
  );
  assert.equal(
    parseProfileArgument([], { DAJEONG_AWS_PROFILE: "environment" }),
    "environment",
  );
  assert.equal(parseProfileArgument([], { AWS_PROFILE: "aws-profile" }), "aws-profile");
});

test("root, IAM user, assumed role 호출자를 구분한다", () => {
  assert.equal(
    classifyCallerArn("arn:aws:iam::account-placeholder:root"),
    "root",
  );
  assert.equal(
    classifyCallerArn("arn:aws:iam::account-placeholder:user/developer"),
    "iam-user",
  );
  assert.equal(classifyCallerArn(assumedRoleArn), "assumed-role");
});

test("보호 조건이 모두 준비된 계정을 통과시킨다", () => {
  const checks = evaluateReadiness({
    profileSelected: true,
    profileExists: true,
    ssoConfigured: true,
    region: APPLICATION_REGION,
    identity: { Arn: assumedRoleArn },
    accountSummary: {
      SummaryMap: {
        AccountMFAEnabled: 1,
        AccountAccessKeysPresent: 0,
      },
    },
    budgetInspection: {
      monthlyBudgetExists: true,
      actual80AlertExists: true,
      subscriberExists: true,
    },
  });

  assert.ok(checks.every((check) => check.status === "PASS"));
});

test("인증이 없으면 계정 조회를 건너뛰고 실패 원인만 남긴다", () => {
  const checks = evaluateReadiness({
    profileSelected: true,
    profileExists: true,
    ssoConfigured: true,
    region: APPLICATION_REGION,
  });

  assert.equal(
    checks.find((check) => check.name === "authenticated caller")?.status,
    "FAIL",
  );
  assert.equal(
    checks.find((check) => check.name === "root MFA")?.status,
    "SKIP",
  );
});

test("월간 비용 예산의 실제 지출 80% 알림과 수신자를 확인한다", () => {
  const calls = [];
  const invoke = (args) => {
    calls.push(args);
    const operation = args.slice(0, 2).join(" ");

    if (operation === "budgets describe-budgets") {
      return {
        ok: true,
        stdout: JSON.stringify({
          Budgets: [
            {
              BudgetName: "monthly-staging",
              BudgetType: "COST",
              TimeUnit: "MONTHLY",
              BudgetLimit: { Amount: "10", Unit: "USD" },
            },
          ],
        }),
      };
    }

    if (operation === "budgets describe-notifications-for-budget") {
      return {
        ok: true,
        stdout: JSON.stringify({
          Notifications: [
            {
              NotificationType: "ACTUAL",
              ComparisonOperator: "GREATER_THAN",
              Threshold: 80,
              ThresholdType: "PERCENTAGE",
            },
          ],
        }),
      };
    }

    return {
      ok: true,
      stdout: JSON.stringify({
        Subscribers: [{ SubscriptionType: "EMAIL", Address: "hidden" }],
      }),
    };
  };

  assert.deepEqual(inspectBudgets(invoke, "staging", "hidden-account"), {
    monthlyBudgetExists: true,
    actual80AlertExists: true,
    subscriberExists: true,
  });
  assert.ok(calls.every((args) => args.includes("--profile")));
});

test("실행 보고서에는 AWS 응답 식별자가 포함되지 않는다", () => {
  const sensitiveValues = [assumedRoleArn, "hidden-account", "owner@example.com"];
  const checks = evaluateReadiness({
    profileSelected: true,
    profileExists: true,
    ssoConfigured: true,
    region: APPLICATION_REGION,
    identity: { Account: sensitiveValues[1], Arn: sensitiveValues[0] },
    accountSummary: {
      SummaryMap: {
        AccountMFAEnabled: 1,
        AccountAccessKeysPresent: 0,
      },
    },
    budgetInspection: {
      monthlyBudgetExists: true,
      actual80AlertExists: true,
      subscriberExists: true,
      address: sensitiveValues[2],
    },
  });
  const report = formatReadinessReport(checks);

  for (const value of sensitiveValues) {
    assert.doesNotMatch(report, new RegExp(value.replaceAll(".", "\\.")));
  }
});

test("미구성 profile은 AWS 서비스 API를 호출하지 않는다", () => {
  const calls = [];
  const checks = collectReadiness("missing", (args) => {
    calls.push(args);
    return { ok: true, stdout: "another-profile" };
  });

  assert.deepEqual(calls, [["configure", "list-profiles"]]);
  assert.equal(checks[0].status, "FAIL");
});
