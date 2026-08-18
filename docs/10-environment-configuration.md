# 환경 설정 계약

> 기준일: 2026-08-18
>
> 범위: 현재 구현된 웹, 모바일, API 기반과 다음 health 세로 슬라이스

이 문서는 `local`, `staging`, `production`에서 사용하는 환경변수의 이름, 공개 범위, 주입 시점과 보관 위치를 정의한다. 실제 비밀값은 이 문서, 예제 파일, Git 기록, CI 로그에 남기지 않는다.

## 1. 환경 구분

| 환경 | 목적 | 설정 원천 |
| --- | --- | --- |
| `local` | 개발자 장비와 로컬 Docker Compose | Git에 포함된 `.env.example`을 복사한 ignored `.env` 또는 `.env.local` |
| `staging` | `dev` 통합 검증 | Amplify·EAS 환경 설정, SSM Parameter Store, Secrets Manager |
| `production` | `main` 공개 환경 | Production 전용 Amplify·EAS 환경 설정, SSM Parameter Store, Secrets Manager |

Staging과 Production은 DB 자격 증명, Cognito, 외부 API 키를 공유하지 않는다. `DAJEONG_ENV`는 웹·모바일 빌드 검증 대상을 선택하며 값은 `local`, `staging`, `production` 중 하나다. 로컬에서는 생략하면 `local`을 사용한다.

## 2. 현재 활성 변수

| 소유자 | 변수 | 공개 여부 | 주입 시점 | Local | Staging | Production |
| --- | --- | --- | --- | --- | --- | --- |
| Web | `NEXT_PUBLIC_API_BASE_URL` | 공개 | Next.js build time | `apps/web/.env.local` | Amplify 환경 설정 | Amplify 환경 설정 |
| Mobile | `EXPO_PUBLIC_API_BASE_URL` | 공개 | Expo bundle time | `apps/mobile/.env.local` | EAS environment | EAS environment |
| API | `SPRING_PROFILES_ACTIVE` | 서버 전용 | runtime | 실행 명령의 `local` | 플랫폼의 `staging` | 플랫폼의 `production` |
| API·DB | `DAJEONG_DB_HOST` | 서버 전용 | runtime | 루트 `.env` 또는 안전한 기본값 | SSM Parameter Store | SSM Parameter Store |
| API·DB | `DAJEONG_DB_PORT` | 서버 전용 | runtime | 루트 `.env` 또는 `5432` | SSM Parameter Store | SSM Parameter Store |
| API·DB | `DAJEONG_DB_NAME` | 서버 전용 | runtime | 루트 `.env` 또는 `dajeong` | SSM Parameter Store | SSM Parameter Store |
| API·DB | `DAJEONG_DB_USER` | 서버 전용 | runtime | 루트 `.env` 또는 `dajeong` | SSM Parameter Store | SSM Parameter Store |
| API·DB | `DAJEONG_DB_PASSWORD` | 비밀 | runtime | `dajeong-local-only` 또는 로컬 비밀 저장소 | Secrets Manager | Secrets Manager |

`staging`과 `production`의 API DB 변수는 모두 필수다. `application-staging.yml`과 `application-production.yml`은 기본값 없이 이 변수를 참조하므로, 값이 없으면 Spring이 시작 단계에서 누락 변수명을 포함해 실패한다.

향후 Cognito와 외부 API를 구현할 때 추가할 변수의 이름과 보관 위치는 [외부 서비스·비밀정보 대장](./09-external-services.md)에 먼저 기록하고, 실제 사용이 시작될 때 이 활성 계약과 검증 스크립트에 추가한다.

## 3. 공개·비밀 경계

- `NEXT_PUBLIC_*`는 Next.js가 브라우저 번들에 build time 값으로 인라인한다. 빌드 후 환경을 승격해도 값이 바뀌지 않으므로 환경마다 다시 빌드한다.
- `EXPO_PUBLIC_*`는 Expo 앱 번들에서 읽을 수 있는 공개 설정이다.
- `PASSWORD`, `SECRET`, `TOKEN`, `PRIVATE_KEY`, `API_KEY`, `SERVICE_ACCOUNT` 성격의 값에는 공개 접두사를 붙이지 않는다.
- API DB 자격 증명과 외부 서비스 secret은 웹·앱 빌드 환경에 주입하지 않는다.
- 공개 API URL에도 사용자 이름, 비밀번호, query string, fragment를 넣지 않는다. Staging과 Production URL은 HTTPS만 허용한다.

## 4. 로컬 설정

저장소 루트에서 예제 파일을 복사한다. 생성되는 파일은 Git에서 제외된다.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

모바일의 API URL은 실행 대상이 접근할 수 있는 주소여야 한다. Expo web과 iOS Simulator는 보통 `127.0.0.1`을 사용할 수 있지만, Android Emulator는 일반적으로 `10.0.2.2`, 실제 기기는 개발 장비의 LAN 주소가 필요하다.

## 5. 검증 명령

```bash
# 예제 파일, 누락·형식 실패 케이스, 추적 파일 secret 패턴
pnpm check:configuration

# 현재 앱 실행 환경만 확인
pnpm --filter @dajeong/web check:env
pnpm --filter @dajeong/mobile check:env
node scripts/check-env.mjs --app api --environment local
```

검사기는 값이 아니라 변수명만 출력한다. Secret 검사는 AWS·GitHub·Google·Slack·Stripe 키와 private key 같은 고신뢰 패턴 및 secret 이름의 하드코딩을 탐지한다. 이는 Secrets Manager와 코드 리뷰를 대체하지 않는 추가 방어선이다.

## 6. 배포 환경 규칙

1. Staging과 Production 변수는 별도 저장소와 권한으로 관리한다.
2. GitHub Actions는 장기 AWS access key 대신 OIDC 역할을 사용한다.
3. 웹·앱 공개 URL은 해당 환경 빌드 전에 설정하고, API runtime secret은 번들 빌드 작업에 전달하지 않는다.
4. 배포 로그에는 값 대신 설정 누락 변수명과 검증 결과만 남긴다.
5. 변수 추가·이름 변경·폐기 시 이 문서와 `docs/09-external-services.md`, 예제 파일, 검증 계약을 같은 PR에서 갱신한다.
