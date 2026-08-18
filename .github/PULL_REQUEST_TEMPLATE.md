## 연결된 이슈

Closes #

`dev`에서 `main`으로 보내는 릴리스 PR은 이슈 링크 대신 릴리스 범위를 작성할 수 있습니다.

## 작업 내용

- _변경한 내용을 요약해 주세요._

## 작업 이유

- _이 변경이 필요한 이유를 설명해 주세요._

## 검증

- [ ] `pnpm check:toolchain`
- [ ] `pnpm check:api`
- [ ] `pnpm check:shared-config`
- [ ] `pnpm --filter @dajeong/web build`
- [ ] `pnpm --filter @dajeong/mobile run export:web`
- [ ] 그 밖의 관련 검사나 수동 검증 결과를 아래에 작성했습니다.

## 배포 영향

- 대상 환경: 없음 / Staging / Production
- 설정 또는 마이그레이션 변경:
- 롤백 시 고려사항:

## 체크리스트

- [ ] 브랜치 이름이 `feat|fix|chore/<issue>-<slug>` 형식이거나 문서화된 hotfix/release 예외입니다.
- [ ] PR 대상은 `dev`이거나 `dev → main` 릴리스 또는 hotfix 예외입니다.
- [ ] PR 제목이 Conventional Commits 형식을 따릅니다.
- [ ] 비밀값, 자격 증명, 관련 없는 사용자 변경이 포함되지 않았습니다.
- [ ] 문서와 테스트가 변경된 동작과 일치합니다.
