import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const APPLICATION_REGION = "ap-northeast-2";
export const BUDGETS_API_REGION = "us-east-1";

const CHECKS = {
  profile: "named profile",
  sso: "IAM Identity Center profile",
  region: "application region",
  identity: "authenticated caller",
  temporaryCaller: "temporary assumed role",
  rootMfa: "root MFA",
  rootAccessKeys: "root access keys absent",
  monthlyBudget: "monthly cost budget",
  budgetAlert: "actual spend 80% alert",
  budgetSubscriber: "budget alert subscriber",
};

function result(status, name, detail) {
  return { status, name, detail };
}

function skipped(name, reason) {
  return result("SKIP", name, reason);
}

export function parseProfileArgument(argv, environment = process.env) {
  const profileIndex = argv.indexOf("--profile");

  if (profileIndex >= 0) {
    const value = argv[profileIndex + 1];
    return value && value !== "--" ? value : undefined;
  }

  return environment.DAJEONG_AWS_PROFILE || environment.AWS_PROFILE;
}

export function classifyCallerArn(arn) {
  if (typeof arn !== "string") {
    return "unknown";
  }

  if (/:iam::[^:]+:root$/.test(arn)) {
    return "root";
  }

  if (/:iam::[^:]+:user\//.test(arn)) {
    return "iam-user";
  }

  if (/:sts::[^:]+:assumed-role\//.test(arn)) {
    return "assumed-role";
  }

  return "unknown";
}

export function evaluateReadiness(snapshot) {
  const checks = [];

  if (!snapshot.profileSelected) {
    checks.push(
      result(
        "FAIL",
        CHECKS.profile,
        "--profile 또는 DAJEONG_AWS_PROFILE이 필요합니다.",
      ),
    );
    return checks;
  }

  checks.push(
    result(
      snapshot.profileExists ? "PASS" : "FAIL",
      CHECKS.profile,
      snapshot.profileExists
        ? "선택한 profile이 로컬에 있습니다."
        : "선택한 profile을 찾을 수 없습니다.",
    ),
  );

  if (!snapshot.profileExists) {
    for (const name of Object.values(CHECKS).slice(1)) {
      checks.push(skipped(name, "profile 확인 후 검사합니다."));
    }
    return checks;
  }

  checks.push(
    result(
      snapshot.ssoConfigured ? "PASS" : "FAIL",
      CHECKS.sso,
      snapshot.ssoConfigured
        ? "SSO session 기반 profile입니다."
        : "sso_session 설정이 없습니다.",
    ),
    result(
      snapshot.region === APPLICATION_REGION ? "PASS" : "FAIL",
      CHECKS.region,
      snapshot.region === APPLICATION_REGION
        ? "서울 리전으로 고정되어 있습니다."
        : "기본 리전을 ap-northeast-2로 설정해야 합니다.",
    ),
  );

  if (!snapshot.identity) {
    checks.push(
      result(
        "FAIL",
        CHECKS.identity,
        "인증되지 않았습니다. SSO 로그인이 필요합니다.",
      ),
      skipped(CHECKS.temporaryCaller, "인증 후 검사합니다."),
    );
  } else {
    const callerType = classifyCallerArn(snapshot.identity.Arn);
    checks.push(
      result("PASS", CHECKS.identity, "호출자 인증을 확인했습니다."),
      result(
        callerType === "assumed-role" ? "PASS" : "FAIL",
        CHECKS.temporaryCaller,
        callerType === "assumed-role"
          ? "임시 assumed role 자격 증명입니다."
          : "root 또는 IAM user 대신 SSO assumed role을 사용해야 합니다.",
      ),
    );
  }

  if (!snapshot.identity) {
    for (const name of [
      CHECKS.rootMfa,
      CHECKS.rootAccessKeys,
      CHECKS.monthlyBudget,
      CHECKS.budgetAlert,
      CHECKS.budgetSubscriber,
    ]) {
      checks.push(skipped(name, "인증 후 검사합니다."));
    }
    return checks;
  }

  if (!snapshot.accountSummary) {
    checks.push(
      result("FAIL", CHECKS.rootMfa, "IAM 계정 요약을 읽을 수 없습니다."),
      result(
        "FAIL",
        CHECKS.rootAccessKeys,
        "IAM 계정 요약을 읽을 수 없습니다.",
      ),
    );
  } else {
    const summary = snapshot.accountSummary.SummaryMap ?? {};
    checks.push(
      result(
        summary.AccountMFAEnabled === 1 ? "PASS" : "FAIL",
        CHECKS.rootMfa,
        summary.AccountMFAEnabled === 1
          ? "root MFA가 활성화되어 있습니다."
          : "root MFA를 활성화해야 합니다.",
      ),
      result(
        summary.AccountAccessKeysPresent === 0 ? "PASS" : "FAIL",
        CHECKS.rootAccessKeys,
        summary.AccountAccessKeysPresent === 0
          ? "root access key가 없습니다."
          : "root access key를 비활성화하고 삭제해야 합니다.",
      ),
    );
  }

  if (!snapshot.budgetInspection) {
    checks.push(
      result(
        "FAIL",
        CHECKS.monthlyBudget,
        "AWS Budgets 설정을 읽을 수 없습니다.",
      ),
      skipped(CHECKS.budgetAlert, "월 비용 예산 확인 후 검사합니다."),
      skipped(CHECKS.budgetSubscriber, "80% 알림 확인 후 검사합니다."),
    );
    return checks;
  }

  if (!snapshot.budgetInspection.monthlyBudgetExists) {
    checks.push(
      result(
        "FAIL",
        CHECKS.monthlyBudget,
        "양수 한도의 월간 COST 예산이 필요합니다.",
      ),
      skipped(CHECKS.budgetAlert, "월 비용 예산 확인 후 검사합니다."),
      skipped(CHECKS.budgetSubscriber, "80% 알림 확인 후 검사합니다."),
    );
    return checks;
  }

  checks.push(
    result("PASS", CHECKS.monthlyBudget, "월간 COST 예산이 있습니다."),
  );

  if (!snapshot.budgetInspection.actual80AlertExists) {
    checks.push(
      result(
        "FAIL",
        CHECKS.budgetAlert,
        "ACTUAL·PERCENTAGE·GREATER_THAN 80 알림이 필요합니다.",
      ),
      skipped(CHECKS.budgetSubscriber, "80% 알림 확인 후 검사합니다."),
    );
    return checks;
  }

  checks.push(
    result("PASS", CHECKS.budgetAlert, "실제 지출 80% 알림이 있습니다."),
    result(
      snapshot.budgetInspection.subscriberExists ? "PASS" : "FAIL",
      CHECKS.budgetSubscriber,
      snapshot.budgetInspection.subscriberExists
        ? "80% 알림 수신자가 있습니다."
        : "80% 알림에 EMAIL 또는 SNS 수신자가 필요합니다.",
    ),
  );

  return checks;
}

export function formatReadinessReport(checks) {
  const lines = ["AWS account readiness (identifiers hidden)", ""];

  for (const check of checks) {
    lines.push(
      `${check.status.padEnd(4)} ${check.name.padEnd(28)} ${check.detail}`,
    );
  }

  return lines.join("\n");
}

function invokeAws(args) {
  const command = spawnSync("aws", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      AWS_CLI_AUTO_PROMPT: "off",
      AWS_PAGER: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  });

  return {
    ok: command.status === 0 && command.error === undefined,
    stdout: command.stdout?.trim() ?? "",
  };
}

function invokeJson(invoke, args) {
  const response = invoke([...args, "--output", "json", "--no-cli-pager"]);

  if (!response.ok) {
    return undefined;
  }

  try {
    return JSON.parse(response.stdout);
  } catch {
    return undefined;
  }
}

function isActual80PercentAlert(notification) {
  return (
    notification.NotificationType === "ACTUAL" &&
    notification.ComparisonOperator === "GREATER_THAN" &&
    Number(notification.Threshold) === 80 &&
    (notification.ThresholdType ?? "PERCENTAGE") === "PERCENTAGE"
  );
}

function notificationArgument(notification) {
  const thresholdType = notification.ThresholdType ?? "PERCENTAGE";
  return [
    `NotificationType=${notification.NotificationType}`,
    `ComparisonOperator=${notification.ComparisonOperator}`,
    `Threshold=${Number(notification.Threshold)}`,
    `ThresholdType=${thresholdType}`,
  ].join(",");
}

export function inspectBudgets(invoke, profile, accountId) {
  const response = invokeJson(invoke, [
    "budgets",
    "describe-budgets",
    "--account-id",
    accountId,
    "--profile",
    profile,
    "--region",
    BUDGETS_API_REGION,
  ]);

  if (!response) {
    return undefined;
  }

  const budgets = (response.Budgets ?? []).filter(
    (budget) =>
      budget.BudgetType === "COST" &&
      budget.TimeUnit === "MONTHLY" &&
      Number(budget.BudgetLimit?.Amount) > 0,
  );
  const inspection = {
    monthlyBudgetExists: budgets.length > 0,
    actual80AlertExists: false,
    subscriberExists: false,
  };

  for (const budget of budgets) {
    const notifications = invokeJson(invoke, [
      "budgets",
      "describe-notifications-for-budget",
      "--account-id",
      accountId,
      "--budget-name",
      budget.BudgetName,
      "--profile",
      profile,
      "--region",
      BUDGETS_API_REGION,
    ]);

    if (!notifications) {
      continue;
    }

    for (const notification of notifications.Notifications ?? []) {
      if (!isActual80PercentAlert(notification)) {
        continue;
      }

      inspection.actual80AlertExists = true;
      const subscribers = invokeJson(invoke, [
        "budgets",
        "describe-subscribers-for-notification",
        "--account-id",
        accountId,
        "--budget-name",
        budget.BudgetName,
        "--notification",
        notificationArgument(notification),
        "--profile",
        profile,
        "--region",
        BUDGETS_API_REGION,
      ]);

      if ((subscribers?.Subscribers ?? []).length > 0) {
        inspection.subscriberExists = true;
      }
    }
  }

  return inspection;
}

export function collectReadiness(profile, invoke = invokeAws) {
  if (!profile) {
    return evaluateReadiness({ profileSelected: false });
  }

  const profiles = invoke(["configure", "list-profiles"]);
  const profileExists =
    profiles.ok && profiles.stdout.split(/\r?\n/).includes(profile);
  const snapshot = {
    profileSelected: true,
    profileExists,
  };

  if (!profileExists) {
    return evaluateReadiness(snapshot);
  }

  const ssoSession = invoke([
    "configure",
    "get",
    "sso_session",
    "--profile",
    profile,
  ]);
  const region = invoke([
    "configure",
    "get",
    "region",
    "--profile",
    profile,
  ]);
  snapshot.ssoConfigured = ssoSession.ok && ssoSession.stdout !== "";
  snapshot.region = region.ok ? region.stdout : undefined;
  snapshot.identity = invokeJson(invoke, [
    "sts",
    "get-caller-identity",
    "--profile",
    profile,
    "--region",
    APPLICATION_REGION,
  ]);

  if (snapshot.identity) {
    snapshot.accountSummary = invokeJson(invoke, [
      "iam",
      "get-account-summary",
      "--profile",
      profile,
      "--region",
      APPLICATION_REGION,
    ]);
    snapshot.budgetInspection = inspectBudgets(
      invoke,
      profile,
      snapshot.identity.Account,
    );
  }

  return evaluateReadiness(snapshot);
}

function run() {
  const profile = parseProfileArgument(process.argv.slice(2));
  const checks = collectReadiness(profile);
  console.log(formatReadinessReport(checks));

  if (checks.some((check) => check.status === "FAIL")) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
