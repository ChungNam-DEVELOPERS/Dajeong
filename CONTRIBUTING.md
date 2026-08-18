# Contributing to Dajeong

This repository uses an Issue-driven Git workflow with `dev` for integration and `main` for Production.

## Branch roles

| Branch | Role | Deployment intent |
| --- | --- | --- |
| `main` | Production source of truth | Production after approval |
| `dev` | Integration branch | Staging |
| `feat/*`, `fix/*`, `chore/*` | Short-lived Issue branches | Pull request preview and CI |
| `hotfix/*` | Urgent Production repair | Production first, then synchronize to `dev` |

AWS and EAS deployment credentials are not connected yet. Until those deployment workflows are implemented, `dev` and `main` express the environment contract without claiming that a deployment occurred.

## Standard change workflow

1. Create or select a GitHub Issue with scope, acceptance criteria, and a validation plan.
2. Update the local integration branch:

   ```bash
   git fetch origin
   git switch dev
   git pull --ff-only origin dev
   ```

3. Create a branch from `dev`:

   ```bash
   git switch -c feat/123-trip-create
   ```

4. Implement the smallest coherent change and run the relevant checks.
5. Commit with Conventional Commits.
6. Push the branch and open a pull request targeting `dev`.
7. Include the Issue number in the PR body, allow CI and review conversations to finish, then squash-merge.
8. After the merge, close each fully completed linked Issue as `completed` and leave a Korean comment that references the merged PR.

Do not commit or push directly to `dev` or `main`.

GitHub interprets closing keywords such as `Closes #123` only when a pull request targets the repository's default branch. Normal work targets `dev`, so the merge operator must verify and close the completed Issue explicitly. If a pull request resolves only part of an Issue, keep the Issue open and record the remaining work instead.

## Branch naming

Use lowercase kebab-case after the Issue number.

```text
feat/123-trip-create
fix/456-login-error
chore/789-ci-cache
hotfix/999-auth-outage
```

Normal work starts from `dev`. Only urgent Production fixes use `hotfix/*` from `main`.

## Commits and pull-request titles

Use Conventional Commits:

```text
feat(trip): add trip creation
fix(auth): handle expired login state
chore(ci): cache pnpm dependencies
```

The PR title becomes the squash commit for normal work, so it must also follow the convention.

Write the pull-request description, change summary, impact, and validation evidence in Korean by default. Keep the Conventional Commit type and optional scope in the title; the title description may also be written in Korean.

## Pull requests into dev

- Source: `feat/*`, `fix/*`, `chore/*`, or `hotfix/*`
- Target: `dev`
- Merge method: Squash merge
- Required body content: linked Issue, summary, validation evidence, and deployment impact
- Language: Korean for the PR description and work summary unless another language is explicitly requested
- Required checks: `CI` and `Branch policy`
- Merge completion: close the fully completed linked Issue as `completed` with a Korean comment that references the merged PR

Open a draft PR while work is incomplete. Mark it ready only after the described acceptance criteria and checks are satisfied.

## Releases from dev to main

1. Confirm `dev` is green and the intended release scope is complete.
2. Open a PR with source `dev` and target `main`.
3. Title it `chore(release): <description>`.
4. Run the full CI and resolve all conversations.
5. Use a merge commit. Do not squash or rebase the long-lived `dev` branch into `main`.
6. Synchronize `main` back into `dev` when the release or a Production-only change leaves `dev` behind.

Production deployment will eventually run from `main` after GitHub Environment approval. That CD connection is tracked separately from the branch policy.

## Hotfixes

1. Create an urgent-fix Issue.
2. Branch `hotfix/<issue-number>-<slug>` from the latest `origin/main`.
3. Open a PR to `main` with a `fix(...)` title and complete the required checks.
4. After the Production fix is merged, bring the same change into `dev` through a PR or a controlled `main` to `dev` synchronization.
5. Never leave a Production-only fix absent from `dev`.

## Local baseline checks

Run the checks relevant to the changed area. The current workspace baseline is:

```bash
pnpm check:toolchain
pnpm check:configuration
pnpm check:db
pnpm check:api
pnpm check:shared-config
pnpm --filter @dajeong/web build
pnpm --filter @dajeong/mobile run export:web
```

OpenAPI generation, CDK, and deployment checks must be added to the same CI gate as those components are implemented.

## Protected branches

Both `dev` and `main` require pull requests, successful required checks, and resolved review conversations. Force pushes and branch deletion are disabled. Linear history is not required because release PRs intentionally use merge commits.
