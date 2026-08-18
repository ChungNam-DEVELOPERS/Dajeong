## Linked Issue

Closes #

Release PRs from `dev` to `main` may replace the Issue link with a release scope.

## Summary

- _Describe the change._

## Why

- _Explain why this change is needed._

## Validation

- [ ] `pnpm check:toolchain`
- [ ] `pnpm check:shared-config`
- [ ] `pnpm --filter @dajeong/web build`
- [ ] `pnpm --filter @dajeong/mobile run export:web`
- [ ] Additional relevant checks or manual evidence are listed below

## Deployment impact

- Target environment: None / Staging / Production
- Configuration or migration changes:
- Rollback considerations:

## Checklist

- [ ] The branch follows `feat|fix|chore/<issue>-<slug>` or the documented hotfix/release exception.
- [ ] The PR targets `dev`, or it is a `dev → main` release/hotfix exception.
- [ ] The PR title follows Conventional Commits.
- [ ] No secrets, credentials, or unrelated user changes are included.
- [ ] Documentation and tests match the changed behavior.
