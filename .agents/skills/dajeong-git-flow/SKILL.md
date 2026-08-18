---
name: dajeong-git-flow
description: Enforce and execute the Issue-driven Git workflow for the ChungNam-DEVELOPERS/Dajeong repository. Use whenever Codex starts, implements, publishes, merges, releases, or hotfixes a Dajeong repository change, including requests such as 기능 구현, 버그 수정, 커밋, 푸시, PR, 릴리스, and hotfix.
---

# Dajeong Git Flow

Follow the repository's Issue → branch → pull request flow without direct changes to long-lived branches.

## Establish context

1. Resolve the repository root and read `AGENTS.md` and `CONTRIBUTING.md`.
2. Inspect `git status --short --branch`, the current branch, remotes, and recent commits.
3. Preserve unrelated user changes. Stage only the intended paths.
4. Treat an explicit local-only request as a stopping point before GitHub writes. Otherwise use the repository workflow below.

## Start normal work

1. Use an existing GitHub Issue or create one with the problem, scope, acceptance criteria, and validation plan.
2. Record the Issue number.
3. Fetch the remote and update `dev` with a fast-forward-only pull.
4. Create exactly one branch from the latest `origin/dev`:
   - Feature: `feat/<issue-number>-<slug>`
   - Fix: `fix/<issue-number>-<slug>`
   - Maintenance: `chore/<issue-number>-<slug>`
5. Use lowercase kebab-case for `<slug>`.
6. Never start normal work from `main`.

Use the connected GitHub app for Issue and PR operations. Fall back to authenticated `gh` only when the connector lacks permission or coverage.

## Implement and validate

1. Make the smallest coherent change that satisfies the Issue.
2. Read any applicable nested `AGENTS.md` before editing within that scope.
3. Run the checks relevant to changed components.
4. For the current TypeScript baseline, run:

   ```bash
   pnpm check:toolchain
   pnpm check:shared-config
   pnpm --filter @dajeong/web build
   pnpm --filter @dajeong/mobile run export:web
   ```

5. Inspect the final diff and `git diff --check`.

## Publish normal work

1. Commit with a Conventional Commit message.
2. Push the Issue branch with upstream tracking.
3. Open a PR targeting `dev`.
4. Use a Conventional Commit PR title because GitHub uses it as the squash commit.
5. Write the PR body, change summary, impact, and validation evidence in Korean unless the user explicitly requests another language.
6. Include the matching Issue number, change summary, impact, and validation evidence in the PR body.
7. Default to a draft PR unless the work is complete and the user requested a ready PR.
8. Wait for `CI` and `Branch policy` checks.
9. Squash-merge only when the user authorizes the merge and all required checks and conversations are complete.
10. Never push directly to `dev`.

## Release dev to main

1. Release only when the user explicitly requests it.
2. Confirm `dev` is current, clean, and green.
3. Open a PR from `dev` to `main`.
4. Title it `chore(release): <description>`.
5. Write the release scope and validation evidence in Korean unless the user explicitly requests another language.
6. Use a merge commit. Never squash or rebase `dev` into `main`.
7. Confirm Production deployment approval separately when CD is connected.
8. Synchronize the resulting `main` commit back to `dev` when needed.

## Handle a hotfix

1. Create or select an urgent-fix Issue.
2. Fetch the remote and create `hotfix/<issue-number>-<slug>` from the latest `origin/main`.
3. Validate the fix and open a PR to `main` with a `fix(...)` title.
4. Merge only with explicit user authorization and successful required checks.
5. Bring the Production fix into `dev` through a follow-up PR or controlled `main` to `dev` synchronization.
6. Never leave `dev` without the hotfix.

## Finish

Report the Issue, branch, commit, PR target, merge method, validation results, and whether Staging or Production deployment actually ran. Never describe a branch update as a deployment when deployment automation is not connected.
