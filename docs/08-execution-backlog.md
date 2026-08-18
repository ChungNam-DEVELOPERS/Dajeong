# 0~1단계 실행 백로그

> 상태: 실행 기준선 v1.0
>
> 범위: `0. 외부 준비` + `1. 개발 기반`
>
> 목표: 다음 10개 개발일 동안 로컬 세로 슬라이스, CI, 최소 staging health를 재현 가능하게 완성한다.

이 문서는 [종합 개발 계획](./00-development-plan.md)의 단계 0~1만 실행 단위로 분해한다. 전체 기간과 출시 기준은 [로드맵과 테스트](./07-roadmap-testing.md)를 따른다.

## 1. 사용 방법

- 개발 작업은 한 번에 하나만 `DOING`으로 두는다. 외부 심사 `WAITING`은 WIP에 포함하지 않는다.
- 예상 기간은 실제 구현, 테스트, 짧은 문서화를 포함한 집중 개발 시간이다. `0.5일`은 약 3~4시간이다.
- 작업을 시작할 때 요약표의 상태를 `DOING`으로, 검증까지 끝났을 때만 `DONE`으로 바꾼다.
- 완료 시 명령, CI URL, 스크린샷 또는 짧은 결과를 [진행 기록](#8-진행-기록)에 남긴다.
- 1단계 출구 게이트를 통과하기 전에 2단계 인증·여행·초대 백로그를 같은 수준으로 세분화한다.

### 상태

| 상태 | 의미 |
| --- | --- |
| `TODO` | 선행 작업을 기다리거나 시작 전 |
| `NEXT` | 지금 시작할 수 있는 작업 |
| `DOING` | 현재 구현과 검증 중 |
| `WAITING` | 외부 심사·승인·정보를 기다림 |
| `BLOCKED` | 개발을 계속할 대안이 없는 상태 |
| `DONE` | 완료 조건과 검증 증거를 모두 확인 |

## 2. 범위 경계

### 이번 백로그에 포함

- 외부 계정·API 신청과 승인 대기 시 mock 준비
- pnpm·Turborepo 모노레포와 공통 설정
- Next.js 웹, Expo 앱, Spring Boot API, PostgreSQL·Flyway 기반
- OpenAPI 생성 클라이언트를 쓰는 웹·앱 health 세로 슬라이스
- 로컬 품질 명령, GitHub Actions CI, CDK 기반, 최소 staging 생존 검사

### 아직 하지 않음

- Cognito·소셜 로그인 구현
- `User`, `Trip`, `Membership`, `Invite` 도메인 테이블과 API
- UI 시안 전체 반영
- TourAPI·기상청·ODsay·Bedrock 실제 연동
- 운영급 RDS·SQS·EventBridge·알람과 production 배포

`staging health`는 이 단계에서 **배포된 웹이 배포된 API의 liveness를 확인하는 최소 세로 슬라이스**를 뜻한다. staging의 전체 AWS 운영 구성과 DB readiness는 8단계 출시 게이트에서 완성한다.

## 3. 실행 순서

```text
외부 신청 EXT-01~10 ------------------------------------> 심사는 병렬 대기

FND-01 버전 기준
  └─ FND-02 모노레포 골격
      ├─ FND-03 공통 설정
      ├─ FND-04 웹
      ├─ FND-05 앱
      └─ FND-06 API
          └─ FND-07 PostgreSQL
              └─ FND-08 Flyway·health API
                  └─ FND-10 OpenAPI client
                      ├─ FND-11 웹 health
                      └─ FND-12 앱 health

FND-03~12 → FND-13 루트 품질 명령 → FND-14 CI
FND-14 → FND-15 CDK → FND-16 AWS OIDC → FND-17 staging health
FND-17 → FND-18 clean-room 검증·출구 게이트
```

`FND-09 환경 설정 계약`은 웹·앱·API 생성 후 `FND-10`보다 먼저 수행한다.

### 10개 개발일 목표

| 일차 | 주요 작업 | 일일 검증 |
| --- | --- | --- |
| 1 | `EXT-01~10` 신청 시작, `FND-01~02` | 루트 install과 workspace 탐색 |
| 2 | `FND-03~04` | 공통 설정과 웹 dev·build |
| 3 | `FND-05` | Expo 로컬 실행·export |
| 4 | `FND-06` | Spring test·boot |
| 5 | `FND-07~08` | DB 연결, Flyway, liveness·readiness |
| 6 | `FND-09~10` | 환경 계약과 생성 client 재현 |
| 7 | `FND-11~12` | 웹·앱의 loading·up·error 확인 |
| 8 | `FND-13~14` | 루트 품질 명령과 PR CI 통과 |
| 9 | `FND-15~16` | CDK synth·diff, OIDC 인증 |
| 10 | `FND-17~18` | staging smoke, clean-room 재현 |

예상치가 늘어나면 일차를 고정하지 않고 작업 순서와 출구 게이트를 유지한다. 외부 심사 대기 기간은 10개 개발일에 포함하지 않는다.

1단계 순수 구현 예상치는 8.25일이고 나머지 1.75일은 통합·환경 문제·학습 버퍼로 둔다. 0단계는 짧은 관리 블록으로 나누어 개발과 병렬 진행한다.

## 4. 0단계: 외부 준비 백로그

| 상태 | ID | 작업 | 예상 | 완료 조건 |
| --- | --- | --- | --- | --- |
| `DONE` | EXT-01 | 외부 서비스 대장·비밀정보 규칙 | 0.25일 | 환경별 변수명, 보관 위치, 승인·할당량·만료 상태를 값 없이 기록 |
| `TODO` | EXT-02 | AWS 계정·비용 보호 | 0.5일 | MFA, 서울 리전, 예산 알림, 개발자·배포 권한 분리 계획 확인 |
| `TODO` | EXT-03 | Kakao Developers 앱·OIDC 준비 | 0.25일 | 개발용 앱, 필요 동의 항목, callback 미확정값, 심사 공백 기록 |
| `TODO` | EXT-04 | Google OAuth 클라이언트 준비 | 0.25일 | 테스트 사용자, 웹·앱 client 구분, callback 항목 기록 |
| `TODO` | EXT-05 | Apple Developer·Sign in with Apple 준비 | 0.25일 + 심사 | 등록·심사 상태와 필요 identifier·key 목록 기록 |
| `TODO` | EXT-06 | TourAPI `KorService2`·기상청 API 신청 | 0.5일 + 심사 | 신청 완료, 할당량·이용조건·예제 응답 기록 |
| `TODO` | EXT-07 | ODsay Basic 신청 | 0.25일 + 심사 | 신청 완료, 일일 한도·6개월 종료 추적 항목 기록 |
| `TODO` | EXT-08 | Bedrock 모델 접근 확인 | 0.25일 | 서울 리전의 사용 후보 모델, 요청 상태, 예산 상한 기록 |
| `TODO` | EXT-09 | Expo·EAS·앱스토어 계정 상태 확인 | 0.5일 + 심사 | Expo organization, bundle·package ID 후보, 스토어 가입·심사 상태 기록 |
| `TODO` | EXT-10 | 외부 API mock fixture 준비 | 0.5일 | 승인 대기 서비스별 정상·빈 결과·오류 예제를 민감정보 없이 보존 |

### 0단계 처리 규칙

- client secret, API key, access token, 계정 ID는 Markdown, Git, 스크린샷, 진행 기록에 남기지 않는다.
- 문서에는 예: `TOUR_API_KEY` 같은 변수명과 보관 위치만 기록한다.
- 심사가 남아도 신청 접수 증거와 mock이 있으면 1단계 개발을 계속한다.
- callback URL이 필요하면 placeholder를 기록하고 `FND-17` staging URL 확정 후 갱신한다.

## 5. 1단계: 개발 기반 요약표

| 상태 | ID | 작업 | 예상 | 선행 |
| --- | --- | --- | --- | --- |
| `DONE` | FND-01 | 툴체인 버전 기준 고정 | 0.25일 | - |
| `DONE` | FND-02 | 모노레포 골격·workspace | 0.5일 | FND-01 |
| `DONE` | FND-03 | 공통 TypeScript·lint·디자인 토큰 최소 구성 | 0.25일 | FND-02 |
| `NEXT` | FND-04 | Next.js 웹 부트스트랩 | 0.5일 | FND-02~03 |
| `TODO` | FND-05 | Expo 앱 부트스트랩 | 0.5일 | FND-02~03 |
| `TODO` | FND-06 | Spring Boot API 부트스트랩 | 0.5일 | FND-01~02 |
| `TODO` | FND-07 | 로컬 PostgreSQL 16 구성 | 0.5일 | FND-06 |
| `TODO` | FND-08 | Flyway·Testcontainers·health API | 0.5일 | FND-07 |
| `TODO` | FND-09 | local·staging·production 환경 계약 | 0.25일 | FND-04~08 |
| `TODO` | FND-10 | OpenAPI → TypeScript client 생성 | 0.5일 | FND-08~09 |
| `TODO` | FND-11 | 웹 health 세로 슬라이스 | 0.25일 | FND-04, FND-10 |
| `TODO` | FND-12 | 앱 health 세로 슬라이스 | 0.25일 | FND-05, FND-10 |
| `TODO` | FND-13 | 루트 품질 명령·Turbo 파이프라인 | 0.5일 | FND-03~12 |
| `TODO` | FND-14 | GitHub Actions PR CI | 0.5일 | FND-13 |
| `TODO` | FND-15 | CDK staging 기반·synth·diff | 0.5일 | FND-14, EXT-02 |
| `TODO` | FND-16 | GitHub Actions OIDC 배포 인증 | 0.5일 | FND-15 |
| `TODO` | FND-17 | 최소 staging 배포·health smoke | 1일 | FND-11~16 |
| `TODO` | FND-18 | clean-room 재현·1단계 출구 게이트 | 0.5일 | FND-17 |

## 6. 1단계: 작업별 완료 조건

### FND-01. 툴체인 버전 기준 고정

- **산출물:** Node.js, pnpm, Java 21, 로컬 PostgreSQL 실행 도구의 버전 파일과 필수 CLI 목록
- **완료:** 새 셀에서 버전 확인 명령이 모두 통과하고 pnpm은 `packageManager`로 고정됨
- **검증:** 루트 `pnpm check:toolchain`이 정상 환경에서 통과하고 버전 불일치를 실패로 반환
- **학습 포인트:** 런타임, 패키지 관리자, 빌드 도구의 역할 구분

### FND-02. 모노레포 골격·workspace

- **산출물:** `apps/web`, `apps/mobile`, `services/api`, `packages/api-client`, `packages/design-tokens`, `packages/config`, `infra/cdk`
- **완료:** pnpm workspace가 Node 패키지를 모두 탐색하고 루트 lockfile이 하나만 생성됨
- **검증:** 루트 install과 workspace 목록 명령 통과, 비밀정보·생성물 ignore 확인
- **학습 포인트:** workspace와 Turborepo 태스크 그래프의 차이

### FND-03. 공통 설정·디자인 토큰 최소 구성

- **산출물:** 공통 TypeScript·lint 설정과 한 개 이상의 의미 디자인 토큰 export
- **완료:** 웹과 앱이 공통 설정을 확장하되 UI 컴포넌트는 공유하지 않음
- **검증:** 임의의 잘못된 TypeScript 코드를 검출하는 스크립트 확인
- **학습 포인트:** 공유해야 할 규칙과 플랫폼별 UI를 분리하는 경계

### FND-04. Next.js 웹 부트스트랩

- **산출물:** Next.js App Router 앱과 최소 홈 페이지
- **완료:** dev server, typecheck, production build가 통과하고 자동 생성 예제 코드가 정리됨
- **검증:** 브라우저에서 홈 응답과 콘솔 오류 없음을 확인
- **학습 포인트:** App Router의 server/client 경계

### FND-05. Expo 앱 부트스트랩

- **산출물:** Expo Router 앱, 안정적인 `scheme`과 앱 식별자 후보
- **완료:** iOS·Android 중 최소 하나의 로컬 runtime과 양쪽 export smoke가 통과
- **검증:** 홈 화면의 실제 런타임 스크린샷과 export 명령 결과 기록
- **학습 포인트:** Expo Go, development build, production build의 차이

### FND-06. Spring Boot API 부트스트랩

- **산출물:** Java 21·Spring Boot API, Gradle wrapper, Actuator, validation, OpenAPI, Flyway·PostgreSQL 의존성
- **완료:** wrapper로 compile·test·boot가 되고 로컬 환경에서 JAR를 빌드할 수 있음
- **검증:** `./gradlew test` 및 실행 후 프로세스 정상 종료 확인
- **학습 포인트:** Gradle wrapper와 Spring auto-configuration

### FND-07. 로컬 PostgreSQL 16

- **산출물:** Docker Compose PostgreSQL 16, healthcheck, named volume, 로컬 전용 예시 설정
- **완료:** 동일한 명령으로 시작·정지·상태 확인이 되고 DB 재시작 후 볼륨이 유지됨
- **검증:** DB healthcheck 통과와 Spring 연결 확인
- **학습 포인트:** container 생명주기와 DB volume 지속성

### FND-08. Flyway·Testcontainers·health API

- **산출물:** 최초 Flyway migration, migration 통합 테스트, 운영용 liveness·readiness, `GET /api/v1/system/health`
- **완료:** 빈 DB에 migration이 순서대로 적용되고, DB 중단 시 liveness와 readiness가 다르게 반응함
- **검증:** Testcontainers PostgreSQL 테스트, health 정상·DB 중단 케이스 통과
- **학습 포인트:** liveness와 readiness의 차이, schema migration을 코드로 관리하는 이유

### FND-09. 환경 설정 계약

- **산출물:** `local`, `staging`, `production` 변수 목록, `.env.example`, 서버 전용·클라이언트 공개 경계
- **완료:** 필수값 누락 시 각 앱이 명확한 오류로 실패하고 실제 secret이 Git에 없음
- **검증:** secret scan과 누락 변수 실패 케이스 확인
- **학습 포인트:** build-time 설정과 runtime secret의 차이

### FND-10. OpenAPI → TypeScript client 생성

- **산출물:** Spring OpenAPI 스키마, `packages/api-client` 생성 스크립트, health API 타입·함수
- **완료:** 수동 DTO 없이 웹·앱에서 client를 import할 수 있고 두 번 생성해도 diff가 없음
- **검증:** API schema 변경 후 미생성 client를 CI가 검출할 수 있는지 확인
- **학습 포인트:** API 계약을 단일 원천으로 유지하는 방법

### FND-11. 웹 health 세로 슬라이스

- **산출물:** 생성 client로 API health를 조회하는 웹 화면
- **완료:** loading, `UP`, API 연결 실패, 재시도 상태가 표현됨
- **검증:** API 정상·중단을 각각 재현하고 웹 테스트 통과
- **학습 포인트:** server state와 UI state, 사용자가 복구할 수 있는 오류 표현

### FND-12. 앱 health 세로 슬라이스

- **산출물:** 같은 생성 client로 API health를 조회하는 앱 화면
- **완료:** loading, `UP`, 오프라인·API 실패, 재시도 상태가 표현됨
- **검증:** 시뮬레이터 또는 실제 기기에서 로컬 API 접근과 중단 상태 확인
- **학습 포인트:** 모바일의 `localhost`, 네트워크, 재연결 차이

### FND-13. 루트 품질 명령·Turbo 파이프라인

- **산출물:** 루트 `lint`, `typecheck`, `test`, `build`, API test, OpenAPI 검증 명령과 Turbo 캐시 규칙
- **완료:** 루트에서 한 번에 품질 게이트를 실행하고 하위 작업 실패가 전파됨
- **검증:** 정상 통과와 의도적 한 개 실패의 비정상 종료 코드 확인
- **학습 포인트:** 작업 그래프와 캐시가 CI 시간을 줄이는 방법

### FND-14. GitHub Actions PR CI

- **산출물:** Markdown, TypeScript, Spring, OpenAPI client, 웹 build, Expo export를 검증하는 workflow
- **완료:** clean checkout에서 lockfile 기반으로 통과하고 빌드·테스트 실패가 PR을 실패로 만듦
- **검증:** 최소 한 번의 실패 재현 후 복구하여 녹색 CI 확인
- **학습 포인트:** 로컬 재현성과 CI 재현성이 달라지는 이유

### FND-15. CDK staging 기반·synth·diff

- **산출물:** `infra/cdk` 앱, staging·production 환경 구분, 네이밍·태그·리전 규칙
- **완료:** `ap-northeast-2` staging synth가 재현되고 diff에는 의도한 변경만 나타남
- **검증:** synth 결과와 실제 staging 계정 대상 diff 결과 기록
- **학습 포인트:** IaC의 desired state와 `synth`·`diff`·`deploy`의 차이

### FND-16. GitHub Actions OIDC 배포 인증

- **산출물:** GitHub OIDC trust, staging 배포 역할, 최소 권한 정책, 인증 smoke workflow
- **완료:** 장기 AWS access key 없이 특정 repository·branch만 staging 역할을 취득함
- **검증:** 허용된 조건의 성공과 허용되지 않은 조건의 실패 기록
- **학습 포인트:** 장기 키 대신 단기 federation을 쓰는 이유

### FND-17. 최소 staging 배포·health smoke

- **산출물:** staging API liveness URL, staging 웹 URL, 배포 자동화, health smoke 스크립트
- **완료:** 배포된 웹이 배포된 API의 `UP`을 표시하고 앱도 staging base URL로 같은 응답을 확인함
- **검증:** 배포 후 liveness HTTP 200, CORS, 웹 연결, 앱 연결 스모크 기록
- **학습 포인트:** build 성공과 실제 배포 성공이 다른 이유

### FND-18. clean-room 재현·1단계 출구 게이트

- **산출물:** 루트 README 실행 절차, 문제 해결 항목, 출구 게이트 증거
- **완료:** 기존 캐시·수동 설정을 쓰지 않는 새 임시 디렉터리에서 README만으로 install·DB·API·웹·앱·test를 재현함
- **검증:** [1단계 출구 게이트](#7-1단계-출구-게이트) 전체 통과
- **학습 포인트:** 문서도 실행 가능한 제품 인터페이스라는 관점

## 7. 1단계 출구 게이트

다음 항목이 모두 통과해야 2단계 백로그를 확정한다.

- [ ] 새 환경에서 툴체인 확인과 루트 install을 재현했다.
- [ ] PostgreSQL 16을 시작하고 빈 DB에 Flyway migration을 적용했다.
- [ ] API liveness·readiness·`/api/v1/system/health`가 정해진 스키마로 응답한다.
- [ ] OpenAPI에서 TypeScript client를 재생성해도 추가 diff가 없다.
- [ ] 웹과 앱이 생성 client로 로컬 API의 loading·up·error·retry를 표시한다.
- [ ] lint, typecheck, unit·integration test, Spring build, web build, Expo export를 루트에서 실행한다.
- [ ] PR CI가 실패를 막고 현재 커밋에서 녹색이다.
- [ ] staging CDK synth·diff와 GitHub OIDC 역할 취득을 검증했다.
- [ ] staging 웹이 staging API health를 표시하고 배포 후 smoke가 통과한다.
- [ ] repository와 CI 로그에 secret·token·실제 API key가 없다.
- [ ] 외부 서비스는 승인, `WAITING + mock`, 또는 사용 불가와 대안 중 하나로 분류됐다.

## 8. 진행 기록

작업을 `DONE`으로 바꿀 때 한 줄씩 추가한다. 비밀정보는 기록하지 않는다.

| 날짜 | ID | 결과 | 검증 증거 | 다음 작업 |
| --- | --- | --- | --- | --- |
| 2026-08-18 | EXT-01 | 외부 서비스·변수명·보관 규칙 대장 생성 | [`09-external-services.md`](./09-external-services.md), secret 값 없음 확인 | FND-01 |
| 2026-08-18 | FND-01 | Node 24.19.0, pnpm 11.22.0, Java 21 버전 고정과 검사기 구성 | `pnpm check:toolchain` 통과, 의도적 Node 23 불일치 실패 | FND-02 |
| 2026-08-18 | FND-02 | pnpm workspace 6개와 Turborepo 2.10.10 골격 구성 | `pnpm workspace:list`, workspace 6개 탐색, 루트 lockfile 1개 확인 | FND-03 |
| 2026-08-18 | FND-03 | 웹·앱 공통 TypeScript·ESLint 설정과 의미 기반 색상·간격 토큰 구성 | `pnpm check:shared-config` 통과, 의도적 오류 fixture가 `TS2322`로 실패 | FND-04 |

## 9. 2단계 상세화 시점

`FND-18`이 끝나면 실제 속도와 외부 승인 상태를 반영해 단계 2를 세분화한다. 이때도 작업 하나는 최대 2일을 넘지 않게 한다.

예정 세로 슬라이스:

1. Cognito 기본 로그인 → `/api/v1/me` → 웹·앱 사용자 표시
2. 여행 생성 → DB 저장 → 웹·앱 목록
3. 초대 발급 → 로그인 복귀 → 3~6인 가입·권한 검증
4. 계정 삭제 → 도메인 처리 → 웹·앱 완료 흐름
