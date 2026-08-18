const env = (name) => process.env[name]?.trim() ?? "";

const base = env("PR_BASE");
const head = env("PR_HEAD");
const title = env("PR_TITLE");
const body = process.env.PR_BODY ?? "";

function fail(message) {
  console.error(`::error title=Branch policy::${message}`);
  process.exit(1);
}

const conventionalTitle =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9-]*\))?!?: .+/;

if (!base || !head || !title) {
  fail("PR_BASE, PR_HEAD, and PR_TITLE are required.");
}

if (!conventionalTitle.test(title)) {
  fail("Pull-request title must follow Conventional Commits.");
}

const slug = "[a-z0-9]+(?:-[a-z0-9]+)*";
const normalBranch = new RegExp(
  `^(feat|fix|chore)\\/([1-9]\\d*)-(${slug})$`,
);
const hotfixBranch = new RegExp(`^hotfix\\/([1-9]\\d*)-(${slug})$`);

let issueNumber = "";

if (base === "dev") {
  if (head === "main") {
    if (!/^chore\(sync\): .+/.test(title)) {
      fail("A main → dev synchronization PR must use chore(sync): <description>.");
    }
  } else {
    const match = head.match(normalBranch) ?? head.match(hotfixBranch);

    if (!match) {
      fail(
        "PRs into dev must come from feat/<issue>-<slug>, fix/<issue>-<slug>, chore/<issue>-<slug>, hotfix/<issue>-<slug>, or main.",
      );
    }

    const isNormalBranch = ["feat", "fix", "chore"].includes(match[1]);
    issueNumber = isNormalBranch ? match[2] : match[1];
  }
} else if (base === "main") {
  if (head === "dev") {
    if (!/^chore\(release\): .+/.test(title)) {
      fail("A dev → main release PR must use chore(release): <description>.");
    }
  } else {
    const match = head.match(hotfixBranch);

    if (!match) {
      fail("PRs into main must come from dev or hotfix/<issue>-<slug>.");
    }

    if (!/^fix(\([a-z0-9][a-z0-9-]*\))?!?: .+/.test(title)) {
      fail("A hotfix PR must use a fix(...) Conventional Commit title.");
    }

    issueNumber = match[1];
  }
} else {
  fail("This policy only accepts pull requests targeting dev or main.");
}

if (issueNumber) {
  const issueReference = new RegExp(
    `(^|[^0-9])#${issueNumber}(?![0-9])`,
    "m",
  );

  if (!issueReference.test(body)) {
    fail(`Pull-request body must reference #${issueNumber}.`);
  }

  const token = env("GH_TOKEN");
  const repository = env("GITHUB_REPOSITORY");

  if (token && repository) {
    let response;

    try {
      response = await fetch(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "dajeong-branch-policy",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`Could not verify Issue #${issueNumber}: ${message}`);
    }

    if (!response.ok) {
      fail(
        `Could not verify Issue #${issueNumber}: GitHub returned ${response.status}.`,
      );
    }

    const issue = await response.json();

    if (issue.pull_request) {
      fail(`#${issueNumber} is a pull request, not an Issue.`);
    }

    console.log(`Verified linked Issue #${issueNumber}: ${issue.title}`);
  } else {
    console.log(
      `Validated Issue reference #${issueNumber}; live lookup skipped outside GitHub Actions.`,
    );
  }
}

console.log(`Branch policy passed: ${head} → ${base}`);
