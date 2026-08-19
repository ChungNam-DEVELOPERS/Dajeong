# 0~1단계 실행 백로그

> 상태: 실행 기준선 v1.1 · 웹 우선
>
> 범위: `0. 외부 준비` + `1. 개발 기반`
>
> 목표: 다음 10개 개발일 동안 웹 로컬 세로 슬라이스, CI, 최소 staging health를 재현 가능하게 완성한다.

> 2026-08-19 결정: [Issue #31](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/31)에 따라 1차 공개 베타는 웹을 우선하고 모바일 기능은 웹 MVP 안정화 후 재개한다.
>
> 2026-08-19 진행: [Issue #35](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/35)에서 여행 생성 → DB 저장 → 웹 목록 세로 슬라이스를 구현하고 검증했다.
>
> 2026-08-19 진행: [Issue #41](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/41)에서 기존 일정 입력 → revision 기반 초안 편집 → 불변 버전 발행 웹 세로 슬라이스를 구현하고 검증했다.
>
> 2026-08-19 진행: [Issue #45](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/45)에서 수동 문제 신고 → 그룹 확인 → 원본 유지 또는 재조정 시작 웹 세로 슬라이스를 구현하고 검증했다.
>
> 2026-08-19 진행: [Issue #47](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/47)에서 향후 24시간 야외 일정 → 강수확률 60% 경계 감지 → 그룹 날씨 근거 표시 세로 슬라이스를 mock 기상 어댑터로 구현하고 검증했다.
>
> 2026-08-19 진행: [Issue #49](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/49)에서 재조정 요청 → 결정론적 공정성 점수 기반 후보 1~3개 생성 → 진행·실패·후보 부족 표시 세로 슬라이스를 구현하고 검증했다.

이 문서는 [종합 개발 계획](./00-development-plan.md)의 단계 0~1만 실행 단위로 분해한다. 전체 기간과 출시 기준은 [로드맵과 테스트](./07-roadmap-testing.md)를 따른다.

## 1. 사용 방법

- 개발 작업은 한 번에 하나만 `DOING`으로 두는다. 외부 심사 `WAITING`과 의도적으로 미룬 `DEFERRED`는 WIP에 포함하지 않는다.
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
| `DEFERRED` | 현재 우선순위에서 제외했으며 명시된 재개 조건까지 시작하지 않음 |
| `BLOCKED` | 개발을 계속할 대안이 없는 상태 |
| `DONE` | 완료 조건과 검증 증거를 모두 확인 |

## 2. 범위 경계

### 이번 백로그에 포함

- 외부 계정·API 신청과 승인 대기 시 mock 준비
- pnpm·Turborepo 모노레포와 공통 설정
- Next.js 웹, Spring Boot API, PostgreSQL·Flyway 기반과 기존 Expo 앱 골격
- OpenAPI 생성 클라이언트를 쓰는 웹 health 세로 슬라이스
- 웹 PKCE 세션·현재 사용자와 여행 생성·내 여행 목록 세로 슬라이스
- `User`, `Trip`, `Membership` 최소 도메인 테이블과 생성·조회 API
- 기존 Expo 앱의 lint·typecheck·export 회귀 검사
- 로컬 품질 명령, GitHub Actions CI, CDK 기반, 최소 staging 생존 검사

### 아직 하지 않음

- Cognito 실환경·소셜 IdP 연결과 Hosted UI 검증
- 여행 상세·수정, 멤버 초대·가입, `Invite` 도메인 테이블과 API
- Expo 실기기 검증과 신규 모바일 기능·health 화면
- UI 시안 전체 반영
- TourAPI·기상청·ODsay·Bedrock 실제 연동
- 운영급 RDS·SQS·EventBridge·알람과 production 배포

`staging health`는 이 단계에서 **배포된 웹이 배포된 API의 liveness를 확인하는 최소 세로 슬라이스**를 뜻한다. staging의 전체 AWS 운영 구성과 DB readiness는 8단계 출시 게이트에서 완성한다.

## 3. 실행 순서

```text
외부 신청 EXT-01~08, EXT-10 -----------------------------> 심사는 병렬 대기
모바일 계정 EXT-09 --------------------------------------> DEFERRED: 웹 MVP 후

FND-01 버전 기준
  └─ FND-02 모노레포 골격
      ├─ FND-03 공통 설정
      ├─ FND-04 웹
      ├─ FND-05 앱 (DEFERRED: 웹 MVP 후)
      └─ FND-06 API
          └─ FND-07 PostgreSQL
              └─ FND-08 Flyway·health API
                  └─ FND-10 OpenAPI client
                      ├─ FND-11 웹 health
                      └─ FND-12 앱 health (DEFERRED: 웹 MVP 후)

FND-03~04, FND-06~11 → FND-13 루트 품질 명령 → FND-14 CI
FND-14 → FND-15 CDK → FND-16 AWS OIDC → FND-17 staging health
FND-17 → FND-18 clean-room 검증·출구 게이트
```

`FND-09 환경 설정 계약`은 웹·앱·API 생성 후 `FND-10`보다 먼저 수행한다.
`FND-05`와 `FND-12`는 웹 공개 베타가 안정화된 뒤 재개하며 `FND-13~18`과 2단계 웹 개발의 선행 조건이 아니다.

### 10개 개발일 목표

| 일차 | 주요 작업 | 일일 검증 |
| --- | --- | --- |
| 1 | `EXT-01~08`, `EXT-10` 신청 시작, `FND-01~02` | 루트 install과 workspace 탐색 |
| 2 | `FND-03~04` | 공통 설정과 웹 dev·build |
| 3 | `FND-06` | Spring test·boot |
| 4 | `FND-07~08` | DB 연결, Flyway, liveness·readiness |
| 5 | `FND-09~10` | 환경 계약과 생성 client 재현 |
| 6 | `FND-11` | 웹 loading·up·error·retry 확인 |
| 7 | `FND-13` | 루트 품질 명령과 실패 전파 확인 |
| 8 | `FND-14` | PR CI 통과 |
| 9 | `FND-15~16` | CDK synth·diff, OIDC 인증 |
| 10 | `FND-17~18` | staging smoke, clean-room 재현 |

예상치가 늘어나면 일차를 고정하지 않고 작업 순서와 출구 게이트를 유지한다. 외부 심사 대기 기간은 10개 개발일에 포함하지 않는다.

웹 우선 1단계 순수 구현 예상치는 7.5일이고 나머지 2.5일은 통합·환경 문제·학습 버퍼로 둔다. 0단계는 짧은 관리 블록으로 나누어 개발과 병렬 진행한다.

## 4. 0단계: 외부 준비 백로그

| 상태 | ID | 작업 | 예상 | 완료 조건 |
| --- | --- | --- | --- | --- |
| `DONE` | EXT-01 | 외부 서비스 대장·비밀정보 규칙 | 0.25일 | 환경별 변수명, 보관 위치, 승인·할당량·만료 상태를 값 없이 기록 |
| `TODO` | EXT-02 | AWS 계정·비용 보호 | 0.5일 | MFA, 서울 리전, 예산 알림, 개발자·배포 권한 분리 계획 확인 |
| `TODO` | EXT-03 | Kakao Developers 앱·OIDC 준비 | 0.25일 | 개발용 앱, 필요 동의 항목, callback 미확정값, 심사 공백 기록 |
| `TODO` | EXT-04 | Google OAuth 클라이언트 준비 | 0.25일 | 웹 테스트 사용자·client·callback 항목 기록, 앱 client는 후속 분리 |
| `TODO` | EXT-05 | Apple Developer·Sign in with Apple 준비 | 0.25일 + 심사 | 등록·심사 상태와 필요 identifier·key 목록 기록 |
| `TODO` | EXT-06 | TourAPI `KorService2`·기상청 API 신청 | 0.5일 + 심사 | 신청 완료, 할당량·이용조건·예제 응답 기록 |
| `TODO` | EXT-07 | ODsay Basic 신청 | 0.25일 + 심사 | 신청 완료, 일일 한도·6개월 종료 추적 항목 기록 |
| `TODO` | EXT-08 | Bedrock 모델 접근 확인 | 0.25일 | 서울 리전의 사용 후보 모델, 요청 상태, 예산 상한 기록 |
| `DEFERRED` | EXT-09 | Expo·EAS·앱스토어 계정 상태 확인 | 0.5일 + 심사 | 웹 MVP 안정화 후 Expo organization, bundle·package ID 후보, 스토어 가입·심사 상태 기록 |
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
| `DONE` | FND-04 | Next.js 웹 부트스트랩 | 0.5일 | FND-02~03 |
| `DEFERRED` | FND-05 | Expo 앱 부트스트랩 실기기 검증 | 0.5일 | 웹 MVP 안정화, FND-02~03 |
| `DONE` | FND-06 | Spring Boot API 부트스트랩 | 0.5일 | FND-01~02 |
| `DONE` | FND-07 | 로컬 PostgreSQL 16 구성 | 0.5일 | FND-06 |
| `DONE` | FND-08 | Flyway·Testcontainers·health API | 0.5일 | FND-07 |
| `DONE` | FND-09 | local·staging·production 환경 계약 | 0.25일 | FND-04~08 |
| `DONE` | FND-10 | OpenAPI → TypeScript client 생성 | 0.5일 | FND-08~09 |
| `DONE` | FND-11 | 웹 health 세로 슬라이스 | 0.25일 | FND-04, FND-10 |
| `DEFERRED` | FND-12 | 앱 health 세로 슬라이스 | 0.25일 | 웹 MVP 안정화, FND-05, FND-10 |
| `NEXT` | FND-13 | 루트 품질 명령·Turbo 파이프라인 | 0.5일 | FND-03~04, FND-06~11 |
| `TODO` | FND-14 | GitHub Actions PR CI | 0.5일 | FND-13 |
| `TODO` | FND-15 | CDK staging 기반·synth·diff | 0.5일 | FND-14, EXT-02 |
| `TODO` | FND-16 | GitHub Actions OIDC 배포 인증 | 0.5일 | FND-15 |
| `TODO` | FND-17 | 최소 staging 배포·health smoke | 1일 | FND-11, FND-13~16 |
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
- **2026-08-18 진행 증거:** Expo doctor 21/21, lint·typecheck, Android·iOS·web export, 390px 웹 런타임과 브라우저 오류 0건 통과
- **남은 완료 조건:** 현재 개발 Mac에 Xcode Simulator·Android SDK가 없으므로 Expo Go 실기기 또는 네이티브 개발 환경에서 홈 화면을 1회 실행하고 스크린샷을 남긴다.
- **재개 조건:** 웹 공개 베타가 안정화되어 모바일 제품화가 다음 활성 마일스톤으로 승인됨

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
- **2026-08-18 검증 증거:** `pnpm check:db`, PostgreSQL 16.15 healthcheck, 컨테이너 재생성 후 검증 데이터 유지, Spring `local` 프로필의 Hikari·Flyway 연결과 `/actuator/health` `UP` 확인

### FND-08. Flyway·Testcontainers·health API

- **산출물:** 최초 Flyway migration, migration 통합 테스트, 운영용 liveness·readiness, `GET /api/v1/system/health`
- **완료:** 빈 DB에 migration이 순서대로 적용되고, DB 중단 시 liveness와 readiness가 다르게 반응함
- **검증:** Testcontainers PostgreSQL 테스트, health 정상·DB 중단 케이스 통과
- **학습 포인트:** liveness와 readiness의 차이, schema migration을 코드로 관리하는 이유
- **2026-08-18 검증 증거:** PostgreSQL 16.15 Testcontainer의 빈 DB에 Flyway `V1` 적용, DB 정상 시 liveness·readiness·시스템 Health `UP`, 컨테이너 중단 시 liveness `UP`·readiness와 시스템 Health `DOWN/503` 확인

### FND-09. 환경 설정 계약

- **산출물:** `local`, `staging`, `production` 변수 목록, `.env.example`, 서버 전용·클라이언트 공개 경계
- **완료:** 필수값 누락 시 각 앱이 명확한 오류로 실패하고 실제 secret이 Git에 없음
- **검증:** secret scan과 누락 변수 실패 케이스 확인
- **학습 포인트:** build-time 설정과 runtime secret의 차이
- **2026-08-18 검증 증거:** 환경별 활성 변수와 공개 경계 문서화, 웹·모바일·API 누락 변수 실패 재현, `pnpm check:configuration`, Spring 테스트·bootJar, 웹 production build, Expo web export 통과

### FND-10. OpenAPI → TypeScript client 생성

- **산출물:** Spring OpenAPI 스키마, `packages/api-client` 생성 스크립트, health API 타입·함수
- **완료:** 수동 DTO 없이 웹·앱에서 client를 import할 수 있고 두 번 생성해도 diff가 없음
- **검증:** API schema 변경 후 미생성 client를 CI가 검출할 수 있는지 확인
- **학습 포인트:** API 계약을 단일 원천으로 유지하는 방법
- **2026-08-19 검증 증거:** Spring 컨텍스트에서 OpenAPI 3.1 스키마 생성, 웹·앱 import smoke, health client 단위 테스트, 연속 생성 무변경과 의도적 스키마 불일치 실패, `pnpm check:api-client` 통과

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
- **재개 조건:** 웹 공개 베타가 안정화되고 FND-05 실기기 검증을 완료함

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
- **완료:** 배포된 웹이 배포된 API의 `UP`을 표시함
- **검증:** 배포 후 liveness HTTP 200, CORS, 웹 연결 스모크 기록
- **학습 포인트:** build 성공과 실제 배포 성공이 다른 이유

### FND-18. clean-room 재현·1단계 출구 게이트

- **산출물:** 루트 README 실행 절차, 문제 해결 항목, 출구 게이트 증거
- **완료:** 기존 캐시·수동 설정을 쓰지 않는 새 임시 디렉터리에서 README만으로 install·DB·API·웹·test를 재현하고 기존 Expo 골격의 lint·typecheck·export가 회귀하지 않음
- **검증:** [1단계 출구 게이트](#7-1단계-출구-게이트) 전체 통과
- **학습 포인트:** 문서도 실행 가능한 제품 인터페이스라는 관점

## 7. 1단계 출구 게이트

다음 항목이 모두 통과해야 2단계 백로그를 확정한다.

- [ ] 새 환경에서 툴체인 확인과 루트 install을 재현했다.
- [x] PostgreSQL 16을 시작하고 빈 DB에 Flyway migration을 적용했다.
- [x] API liveness·readiness·`/api/v1/system/health`가 정해진 스키마로 응답한다.
- [x] OpenAPI에서 TypeScript client를 재생성해도 추가 diff가 없다.
- [x] 웹이 생성 client로 로컬 API의 loading·up·error·retry를 표시한다.
- [ ] lint, typecheck, unit·integration test, Spring build, web build를 루트에서 실행하고 기존 Expo lint·typecheck·export 회귀 검사를 유지한다.
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
| 2026-08-18 | FND-04 | Next.js 16 App Router·Tailwind CSS 4 기반과 반응형 최소 홈 구성 | lint·typecheck·production build 통과, 데스크톱·390px 브라우저 오류 0건 | FND-05 |
| 2026-08-18 | FND-06 | Java 21·Spring Boot 4.1 API와 재현 가능한 Gradle wrapper, Actuator·OpenAPI 기반 구성 | `pnpm check:api`, `bootRun`, `/actuator/health` `UP`, `/v3/api-docs` OpenAPI 3.1 응답 통과 | FND-07 |
| 2026-08-18 | FND-07 | PostgreSQL 16.15 Compose, healthcheck, named volume과 Spring `local` DataSource 구성 | `pnpm check:db`, DB healthy, 컨테이너 재생성 후 데이터 유지, API health `UP` | FND-08 |
| 2026-08-18 | FND-08 | Flyway `V1`, 시스템 Health API와 DB 연동 readiness 구성 | PostgreSQL 16.15 Testcontainers에서 빈 DB migration, 정상·DB 중단 health 통합 테스트 통과 | FND-09 |
| 2026-08-18 | FND-09 | Local·Staging·Production 환경 설정 계약과 공개 경계, fail-fast 검증, secret 검사 구성 | `pnpm check:configuration`, 누락 변수 실패, Spring·웹·Expo 검증 통과 | FND-10 |
| 2026-08-19 | FND-10 | Spring OpenAPI 계약에서 웹·앱 공용 TypeScript 타입과 health client 생성 | `pnpm check:api-client`, 웹·앱 import smoke, 연속 생성 diff 없음, 의도적 스키마 불일치 감지 | FND-11 |
| 2026-08-19 | FND-11 | 생성 client와 웹 Route Handler로 health loading·UP·DOWN·연결 실패·재시도 화면 구현 | 웹 상태 전이 테스트 3건, lint·typecheck·production build, 브라우저 정상·503·중단·복구 확인 | FND-13 |
| 2026-08-19 | Issue #35 | 여행·방장 멤버십 원자 생성, 멱등 요청, cursor 목록 API와 웹 생성·목록 화면 구현 | PostgreSQL 통합 테스트, OpenAPI client 11건, 웹 상태 테스트 13건, production build, `/trips` 브라우저 오류 0건 | 초대·가입 세로 슬라이스 |
| 2026-08-19 | Issue #37 | 7일 초대 발급·재발급 폐기, 로그인 복귀, 멱등 가입, 6명 동시성 제한과 웹 발급·가입 화면 구현 | API 25건, OpenAPI client 15건, 웹 상태·인증 테스트 17건, production build, Expo web 회귀 export 통과 | 계정 삭제 세로 슬라이스 |
| 2026-08-19 | Issue #39 | 계정 식별정보 익명화, 삭제 token tombstone, 멤버십 종료·방장 여행 보관과 웹 2단계 삭제 흐름 구현 | API 28건, OpenAPI client 17건, 웹 상태·인증 테스트 19건, production build 통과 | 기존 일정 입력 세로 슬라이스 |
| 2026-08-19 | Issue #41 | 여행 기간·중복 검증, revision 낙관적 잠금, 멱등 추가·발행, 불변 일정 버전과 웹 입력·편집·발행 흐름 구현 | API 31건, OpenAPI client 23건, 웹 상태·인증 테스트 24건, production build·Expo web export 통과 | 비공개 선호 입력 세로 슬라이스 |
| 2026-08-19 | Issue #43 | 비공개 선호 저장·본인 조회, 원문 없는 멤버별 제출 현황과 반응형 웹 입력 화면 구현 | API 34건, OpenAPI client 27건, 웹 상태 테스트 28건, production build·Expo web export, 402px·1280px Chrome와 axe 위반 0건 | 수동 문제 신고 세로 슬라이스 |
| 2026-08-19 | Issue #45 | 현재 발행 슬롯의 수동 문제 신고, 그룹 목록, 원본 유지·재조정 시작 상태 전이와 반응형 웹 화면 구현 | API 37건, OpenAPI client 31건, 웹 상태·인증 테스트 32건, production build·Expo web export 통과 | 기상청 날씨 감지 세로 슬라이스 |
| 2026-08-19 | Issue #47 | 최신 발행 일정의 24시간 야외 슬롯과 mock 단기예보를 대조해 강수확률 60% 이상 날씨 문제를 멱등 생성하고 그룹 화면에 예보 근거 표시 | API 39건, OpenAPI client 32건, 웹 상태·인증 테스트 33건, production build·Expo web export 통과 | 재조정 후보 생성 세로 슬라이스 |
| 2026-08-19 | Issue #49 | 멱등 재조정 작업, 버전 고정, 개인별 비공개 점수와 양보 가중치, 결정론 순위로 검증된 후보 최대 3개를 생성하고 진행·실패·부족·stale 상태를 웹에 표시 | API 43건, OpenAPI client 33건, 웹 상태·인증 테스트 35건, production build·Expo web export 통과 | 익명 투표·집계 세로 슬라이스 |

## 9. 2단계 상세화 시점

`FND-18`이 끝나면 실제 속도와 외부 승인 상태를 반영해 단계 2를 세분화한다. 이때도 작업 하나는 최대 2일을 넘지 않게 한다.

예정 세로 슬라이스:

1. ~~Cognito 기본 로그인 → `/api/v1/me` → 웹 사용자 표시~~
2. ~~여행 생성 → DB 저장 → 웹 목록~~ ([Issue #35](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/35))
3. ~~초대 발급 → 로그인 복귀 → 3~6인 가입·권한 검증~~ ([Issue #37](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/37))
4. ~~계정 삭제 → 도메인 처리 → 웹 완료 흐름~~ ([Issue #39](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/39))
5. ~~기존 일정 입력 → revision 기반 초안 편집 → 불변 버전 발행~~ ([Issue #41](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/41))
6. ~~비공개 선호 입력 → 본인 조회 → 멤버별 제출 상태 확인~~ ([Issue #43](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/43))
7. ~~수동 문제 신고 → 방장·멤버 확인 → 원본 일정 유지 또는 재조정 시작 선택~~ ([Issue #45](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/45))
8. ~~향후 24시간 야외 일정 → 강수확률 경계 감지 → 날씨 근거 확인~~ ([Issue #47](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/47))
9. ~~재조정 요청 → 검증 가능한 후보 1~3개 생성 → 진행·실패·후보 부족 확인~~ ([Issue #49](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/49))
10. 익명 투표 생성·변경·철회 → 득표수·참여 인원 집계 → 개인별 선택 비공개 확인

웹 공개 베타가 안정화되면 FND-05와 FND-12를 재개하고 위 세로 슬라이스의 모바일 화면·딥링크·푸시·실기기 검증을 별도 백로그로 상세화한다.
