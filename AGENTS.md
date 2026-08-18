# Dajeong Repository Instructions

## Required Git workflow

- Read `CONTRIBUTING.md` before changing this repository.
- Treat `main` as the Production branch and `dev` as the integration and Staging branch.
- For every repository change, use an existing GitHub Issue or create one before editing, unless the user explicitly requests local-only work.
- Create normal work from the latest `origin/dev` with one of these names:
  - `feat/<issue-number>-<slug>`
  - `fix/<issue-number>-<slug>`
  - `chore/<issue-number>-<slug>`
- Create `hotfix/<issue-number>-<slug>` from the latest `origin/main` only for urgent Production fixes.
- Never commit or push directly to `main` or `dev`.
- Target normal pull requests at `dev` and squash-merge them.
- After a normal pull request is merged into `dev`, close each fully completed linked Issue with a Korean comment that references the merged PR. Keep partially completed Issues open and record the remaining work.
- Target release pull requests from `dev` to `main`; title them `chore(release): <description>` and use a merge commit, never squash.
- After a hotfix reaches `main`, also synchronize that fix into `dev`.
- Use Conventional Commits for commit and pull-request titles.
- Write pull-request descriptions, change summaries, and validation notes in Korean unless the user explicitly requests another language.
- Link the branch Issue in the pull-request body and run all relevant local checks before publishing.
- Do not merge a pull request or trigger a deployment unless the user explicitly requests that external action.

Use the repository-scoped `dajeong-git-flow` skill for Issue, branch, pull-request, release, and hotfix operations.

## Verification

Run the checks relevant to the changed area. For the current workspace baseline, use:

```bash
pnpm check:toolchain
pnpm check:db
pnpm check:api
pnpm check:shared-config
pnpm --filter @dajeong/web build
pnpm --filter @dajeong/mobile run export:web
```

Do not hide, revert, or stage unrelated user changes.

## Code review rules

- Flag direct changes to `main` or `dev`, incorrect PR targets, missing Issue links, and invalid branch names.
- Flag feature PRs that do not target `dev`.
- Flag `main` PRs whose source is neither `dev` nor `hotfix/*`.
- Flag release PRs configured to squash or rebase.
- Keep formatting checks in CI rather than duplicating them as prose review rules.
