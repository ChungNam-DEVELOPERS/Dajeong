# 다정 종합 개발 계획

> 목적: 이 문서 하나만으로 개발 순서, 단계별 산출물, 완료 조건과 배포 경로를 파악한다.
>
> 기준일: 2026-08-18
>
> 개발 조건: 1인 개발, 공개 베타, 13~16주

세부 제품 규칙과 기술 계약은 문서 하단의 [상세 명세 연결](#10-상세-명세-연결)을 따른다. 이 문서와 상세 명세가 충돌하면 상세 명세를 함께 수정해 하나의 결정만 남긴다.

## 1. 최종 목표

대전에서 여행 중인 3~6명이 기존 일정에 문제가 생겼을 때 다음 흐름을 웹과 앱에서 모두 완료할 수 있는 공개 베타를 배포한다.

```text
소셜 로그인
→ 여행과 기존 일정 등록
→ 멤버 초대
→ 개인 선호 비공개 제출
→ 날씨 자동 감지 또는 문제 수동 신고
→ 재조정 후보 생성
→ 익명 투표
→ 공정성 규칙으로 일정 확정
→ 새 일정 버전 공유
```

첫 버전은 대전·한국어만 지원한다. 초기 여행 전체 생성, 숙소 추천, 예약·결제, 실시간 교통·휴관 자동 감지, 해외·다국어는 개발하지 않는다.

## 2. 확정 기술 구성

| 영역 | 선택 |
| --- | --- |
| 저장소 | pnpm workspace + Turborepo 모노레포 |
| 웹 | Next.js 15 App Router, TypeScript, AWS Amplify Hosting |
| 앱 | Expo React Native, Expo Router, EAS Build/Submit |
| 공통 프런트 | TanStack Query, OpenAPI 생성 클라이언트, 디자인 토큰 |
| API | Java 21, Spring Boot 4.1, Gradle, REST `/api/v1` |
| DB | PostgreSQL 16, Flyway, Testcontainers |
| 인증 | Amazon Cognito + 카카오 OIDC + Apple + Google |
| 비동기 작업 | EventBridge Scheduler + SQS + DLQ + transactional outbox |
| 외부 데이터 | TourAPI `KorService2`, 기상청 단기예보, ODsay |
| AI | Amazon Bedrock. 결정론 코드 우선, 제한된 구조화 출력만 사용 |
| 초기 API 배포 | Elastic Beanstalk Java SE에 실행 가능한 JAR |
| 후속 API 배포 | Docker + ECR + ECS Fargate + ALB |
| 인프라 관리 | AWS CDK TypeScript, GitHub Actions OIDC |

## 3. 개발 원칙

1. 화면별로 따로 만들지 않고 `DB → API → 웹 → 앱 → 테스트`가 연결되는 작은 세로 기능 단위로 완성한다.
2. 웹과 앱은 같은 API·상태·권한 규칙을 사용하되 UI 컴포넌트 자체는 공유하지 않는다.
3. 공정성, 투표, 날씨 임계값은 결정론 코드로 구현한다. LLM 결과를 직접 저장하거나 확정하지 않는다.
4. 개인 선호·예산·피로도·투표 원본은 그룹 API, 로그, 분석 이벤트, Bedrock 프롬프트에 넣지 않는다.
5. 외부 데이터가 없으면 추정하지 않고 `정보 없음`을 반환한다.
6. 각 단계는 테스트와 staging 확인이 끝나야 다음 단계로 넘어간다.
7. Production에 수동으로 만든 AWS 리소스는 허용하지 않고 CDK에 기록한다.

## 4. 전체 구현 순서

| 단계 | 예상 기간 | 핵심 결과 |
| --- | --- | --- |
| 0. 외부 준비 | 1~2일, 심사는 병렬 진행 | 계정·API 신청과 비밀정보 관리 기준 |
| 1. 개발 기반 | 1~2주 | 웹·앱·API·DB·CI가 연결된 모노레포 |
| 2. 인증·여행·초대 | 3~5주 | 로그인 사용자가 여행을 만들고 3~6명이 참여 |
| 3. 기존 일정·선호 | 6~7주 | 방장 일정 편집과 멤버별 비공개 선호 |
| 4. 변수 감지 | 8주 | 날씨 자동 감지와 수동 문제 신고 |
| 5. 후보·AI·공정성 | 9~10주 | 검증 가능한 재조정 후보 1~3개 생성 |
| 6. 투표·일정 적용 | 11주 | 익명 투표와 새 일정 버전 확정 |
| 7. 웹·앱 제품화 | 12~13주 | UI 시안 반영, 알림, 접근성, 플랫폼 동등성 |
| 8. 공개 베타 | 14~16주 | AWS 운영, 앱스토어, 보안·성능·복구 검증 |
| 9. Docker 전환 | 베타 후 2~3주 | Beanstalk에서 ECS Fargate로 이전 |

## 5. 단계별 실행 계획

### 단계 0. 외부 준비

코드 작업과 병렬로 다음 계정과 키를 신청한다.

- AWS 계정과 결제 알림, IAM 관리자·개발자 역할
- Kakao Developers 애플리케이션과 OIDC 설정
- Google OAuth 클라이언트
- Apple Developer 계정과 Sign in with Apple 식별자
- 공공데이터포털 TourAPI `KorService2`
- 기상청 단기예보 API
- ODsay Basic 애플리케이션
- Amazon Bedrock 모델 접근
- Expo/EAS 계정, App Store Connect, Google Play Console

완료 조건:

- 키를 로컬 파일이나 Git에 넣지 않고 비밀 저장 위치와 담당 용도를 기록한다.
- 심사가 남은 공급자는 mock으로 개발할 수 있도록 요청·응답 예제를 확보한다.

### 단계 1. 개발 기반

구현 작업:

- `apps/web`, `apps/mobile`, `services/api`, `packages/api-client`, `packages/design-tokens`, `infra/cdk`를 만든다.
- 루트 pnpm·Turborepo 설정과 Spring Gradle wrapper를 구성한다.
- 로컬 PostgreSQL, 최초 Flyway migration, Spring Actuator health endpoint를 만든다.
- 웹과 앱이 동일한 API base URL 설정으로 health 응답을 표시하게 한다.
- lint, typecheck, unit test, Spring build, 웹 build를 실행하는 GitHub Actions를 만든다.
- `local`, `staging`, `production` 환경변수 이름과 `.env.example`을 정의한다.

첫 번째 기술 마일스톤:

> 로컬에서 PostgreSQL·Spring API·Next.js·Expo가 실행되고 웹과 앱이 API health 상태를 표시한다.

완료 조건:

- 새 개발 환경에서 README 절차만으로 전체 로컬 실행이 가능하다.
- PR에서 테스트나 build가 실패하면 병합할 수 없다.
- staging CDK diff를 생성할 수 있다.

### 단계 2. 인증·여행·초대

구현 작업:

- Cognito User Pool, 웹·앱 client, callback URL과 PKCE 흐름을 구성한다.
- 카카오·Apple·Google 로그인 결과를 Cognito JWT 하나로 통합한다.
- `User`, `Trip`, `Membership`, `Invite` 테이블과 권한 검사를 구현한다.
- `/api/v1/me`, `/trips`, `/trips/{id}`, 초대 발급·가입 API를 만든다.
- 초대 코드는 7일 만료, 재발급 시 이전 코드 폐기, 여행당 최대 6명을 적용한다.
- 온보딩, 로그인, 여행 생성, 여행 목록, 초대·가입 화면을 웹과 앱에 구현한다.

두 번째 제품 마일스톤:

> 로그인한 방장이 여행을 만들고 세 명의 사용자가 초대 링크로 참여한 뒤 웹과 앱에서 같은 여행을 확인한다.

완료 조건:

- 인증되지 않은 요청은 `401`, 권한 없는 멤버는 `403`을 받는다.
- 만료 초대는 `410`, 인원 초과는 `TRIP_FULL` 오류를 받는다.
- 앱 딥링크와 웹 초대 링크가 로그인 후 원래 가입 흐름으로 복귀한다.
- 사용자가 앱 안에서 계정 삭제를 요청할 수 있다.

### 단계 3. 기존 일정·비공개 선호

구현 작업:

- `ItineraryVersion`, `ItinerarySlot`, `PrivatePreference`, `ConcessionLedger`를 추가한다.
- 방장 전용 일정 draft CRUD와 publish API를 구현한다.
- TourAPI 장소 검색과 직접 입력 장소를 지원한다.
- 일정 슬롯에 날짜·시각, 장소, 좌표, 실내외, 범주, 1인 비용을 저장한다.
- `If-Match` 낙관적 잠금과 `409 STALE_VERSION` 처리를 구현한다.
- 개인 선호 입력과 본인 조회, 그룹 제출 완료 현황 API를 구현한다.
- 그룹 API DTO와 로그에서 개인 원본값이 제외되는지 자동 테스트한다.

세 번째 제품 마일스톤:

> 방장이 대전 기존 일정을 발행하고 각 멤버가 본인만 볼 수 있는 선호를 제출한다.

완료 조건:

- 대전 밖 좌표, 중복 시간, 잘못된 시간 범위를 저장할 수 없다.
- 다른 멤버는 선호 제출 여부만 보고 원본값은 볼 수 없다.
- 변경된 일정은 기존 버전을 덮어쓰지 않는다.

### 단계 4. 변수 감지

구현 작업:

- `Disruption`, `Notification`, `OutboxEvent`와 integration cache를 추가한다.
- EventBridge 30분 스케줄과 `weather-poll` SQS consumer를 구현한다.
- 향후 24시간 내 야외 슬롯과 강수확률 60% 이상 예보가 겹칠 때 알림을 만든다.
- 예보 발표 시각·슬롯 조합으로 중복 알림을 막는다.
- 멤버가 휴관·교통·기타 문제를 200자 이내로 신고하는 API와 화면을 만든다.
- 감지 후 자동 변경하지 않고 `재조정 시작` 또는 `유지`를 선택하게 한다.

완료 조건:

- 59%는 트리거되지 않고 60%는 트리거된다.
- 동일 예보의 중복 SQS 메시지가 와도 알림은 하나만 생긴다.
- 외부 날씨 장애는 일정 변경으로 이어지지 않고 운영 메트릭과 재시도로 남는다.

### 단계 5. 후보·AI·공정성

구현 작업:

- `ProposalSet`, `Proposal`, `replan-jobs` 큐와 상태 조회 API를 만든다.
- TourAPI 후보 조회, 거리 압축, ODsay 이동시간, 운영시간 검증을 어댑터로 분리한다.
- 멤버 만족도를 `취향 35% + 예산 25% + 이동 20% + 피로·활동 20%`로 계산한다.
- 최저 만족도, 양보 원장 가중 평균, 이동시간, 안정적 ID 순으로 후보를 정렬한다.
- Bedrock은 운영시간 구조화, 설명 생성, 후보 부족 시 허용된 제약 완화에만 사용한다.
- 후보 3개 또는 최대 5회 완화에서 종료하고 실제 검증된 수만 반환한다.
- 생성 진행, 후보 카드, 실패·후보 부족 화면을 웹과 앱에 만든다.

완료 조건:

- 같은 입력은 항상 같은 후보 순위와 공정성 결과를 낸다.
- Bedrock 장애 시 코드 후보와 템플릿 설명으로 계속 진행한다.
- 존재하지 않는 장소·가격·운영시간을 생성하지 않는다.
- 후보 생성 p95가 60초 이내다.

### 단계 6. 투표·일정 적용

구현 작업:

- `Vote`, 투표 upsert·철회 API와 집계 응답을 구현한다.
- 개인 선택은 숨기고 후보별 표 수와 참여 인원만 반환한다.
- 전원 투표 시 즉시, 아니면 12시간 후 마감한다.
- EventBridge 1분 스케줄과 `vote-deadline` consumer를 구현한다.
- 동률은 동일한 공정성 순위로 해소한다.
- 확정 후보 적용, 양보 원장 갱신, 새 일정 버전 생성은 한 트랜잭션으로 처리한다.
- 투표, 확정 결과, 변경 타임라인 화면을 구현한다.

네 번째 제품 마일스톤:

> 네 명이 익명 투표를 완료하고 공정성 규칙에 따라 새 일정 버전이 확정된다.

완료 조건:

- 한 사용자의 중복 요청은 한 표로 처리된다.
- 0표 마감은 원본 일정을 유지한다.
- 오래된 일정 버전의 후보는 적용되지 않는다.
- 동률 결과는 반복 실행해도 변하지 않는다.

### 단계 7. 웹·앱 제품화

구현 작업:

- `ui/`의 9개 시안을 실제 제품 범위에 맞게 웹·앱에 반영한다.
- 제주·초기 일정 생성 문구를 대전·기존 일정 재조정 문구로 수정한다.
- 앱은 Expo Push, 웹은 인앱 알림함을 구현한다.
- 투표 집계는 3초 폴링으로 동기화한다.
- loading, empty, error, stale, offline, permission-denied 상태를 모든 화면에 제공한다.
- 웹 WCAG 2.2 AA, 앱 VoiceOver·TalkBack, 키보드·안전영역을 검증한다.
- 한국어 문구와 개인정보·AI 설명을 최종 검수한다.

완료 조건:

- 핵심 기능이 웹·iOS·Android에서 동일하게 동작한다.
- 색상만으로 상태를 구분하는 화면이 없다.
- 느린 네트워크와 재연결 이후 데이터가 올바르게 복구된다.

### 단계 8. AWS 공개 베타

구현 작업:

- CDK로 Cognito, RDS, SQS·DLQ, EventBridge, IAM, Secrets, CloudWatch를 배포한다.
- Next.js는 Amplify, Spring JAR는 Elastic Beanstalk에 배포한다.
- GitHub Actions OIDC, staging·production 분리, 배포 후 smoke test와 롤백을 구성한다.
- ODsay·Bedrock·AWS 비용 80% 알람과 외부 API 오류 알람을 만든다.
- RDS 자동 백업 7일, 삭제 방지, 복구 훈련을 완료한다.
- `retention-cleanup` 일일 작업으로 여행 종료 30일 후 원본 선호·개인 투표를 삭제한다.
- Playwright, Maestro, Testcontainers, WireMock, 부하·보안 테스트를 통과한다.
- 개인정보처리방침, 이용약관, 앱스토어 개인정보 라벨과 심사 계정을 준비한다.

출시 게이트:

- 웹·iOS·Android 대표 E2E 전체 통과
- P0/P1 결함, DLQ 메시지, 알려진 개인정보 노출 0건
- 후보 생성 p95 60초, 일반 API p95 500ms 목표 충족
- 50개 동시 그룹의 투표·조회 부하 통과
- 계정 삭제, 30일 민감정보 삭제, RDS 복구, Beanstalk 롤백 실증

### 단계 9. Docker와 ECS 전환

공개 베타 안정화 후 진행한다.

1. Spring JAR용 멀티스테이지 Dockerfile과 비루트 실행을 구성한다.
2. GitHub Actions가 이미지를 검사하고 ECR에 commit SHA로 저장한다.
3. API와 SQS 워커를 같은 이미지의 별도 ECS Service로 실행한다.
4. API는 ALB, 워커는 private network에서만 실행한다.
5. Flyway를 ECS one-off migration task로 분리한다.
6. staging 부하·롤백 검증 후 DNS를 ECS로 전환한다.
7. 안정화 후 Beanstalk만 종료하고 Cognito·RDS·SQS·API 계약은 유지한다.

## 6. API·데이터 구현 우선순위

다음 순서로 migration과 API를 추가한다.

1. `User`, `Trip`, `Membership`, `Invite`
2. `ItineraryVersion`, `ItinerarySlot`
3. `PrivatePreference`, `ConcessionLedger`
4. `Disruption`, `Notification`, `OutboxEvent`
5. `ProposalSet`, `Proposal`, integration cache
6. `Vote`

모든 변경 API는 `Idempotency-Key`를 지원하고 일정 수정은 `If-Match`를 사용한다. 오류는 RFC 9457 Problem Details 형식으로 통일한다. API 구현 후 OpenAPI를 생성하고 `packages/api-client`가 최신 상태인지 CI에서 검사한다.

## 7. 테스트 전략

| 계층 | 도구 | 반드시 검증할 것 |
| --- | --- | --- |
| 단위 | JUnit, 프런트 테스트 러너 | 권한, 날씨 경계, 만족도·양보 원장, 동률, 마감 |
| 통합 | Testcontainers, WireMock | DB migration, 외부 API 정상·장애·한도, SQS 멱등성 |
| 계약 | Spring OpenAPI, 생성 TS client | 웹·앱 DTO와 API 호환성 |
| 웹 E2E | Playwright | 로그인부터 일정 확정까지 전체 흐름 |
| 앱 E2E | Maestro | iOS·Android 로그인, 딥링크, 푸시, 투표 |
| 비기능 | 부하·보안·접근성 검사 | p95, 50개 그룹, 권한 우회, WCAG·스크린리더 |

기능은 정상 경로만으로 완료하지 않는다. 외부 API 실패, 후보 0개, 중복 메시지, stale 일정, 0표 마감, 네트워크 재연결 테스트가 함께 통과해야 한다.

## 8. 작업 완료 정의

하나의 기능은 다음 조건을 모두 만족해야 완료다.

- DB migration과 rollback 또는 복구 전략이 있다.
- API 권한·validation·오류 형식·멱등성이 구현됐다.
- OpenAPI와 TypeScript client가 갱신됐다.
- 웹과 앱의 정상·로딩·빈 상태·오류 상태가 구현됐다.
- 단위·통합 테스트와 필요한 E2E가 통과한다.
- 로그에 토큰·개인 선호·투표·프롬프트가 남지 않는다.
- staging에서 실제 기기 또는 브라우저로 확인했다.
- 관련 `docs/` 명세가 코드와 일치한다.

## 9. 지금 바로 시작할 체크리스트

0~1단계의 작업 순서, 선행 조건, 완료 조건과 검증 증거는 [0~1단계 실행 백로그](./08-execution-backlog.md)에서 관리한다.

- [ ] AWS·Kakao·Google·Apple·Expo 개발 계정 상태 확인
- [ ] TourAPI `KorService2`, 기상청, ODsay 키 신청
- [ ] Bedrock 모델 접근 확인
- [ ] 모노레포 디렉터리와 root toolchain 생성
- [ ] Next.js 15 웹 생성
- [ ] Expo 앱 생성
- [ ] Java 21·Spring Boot 4.1 API 생성
- [ ] 로컬 PostgreSQL과 최초 Flyway migration 생성
- [ ] 웹·앱에서 `/actuator/health` 확인
- [ ] GitHub Actions 기본 build·test 구성

첫 번째 주에는 AI, 투표, 전체 UI를 시작하지 않는다. `로그인 → 여행 생성 → DB 저장 → 웹·앱 조회` 세로 기능의 기반을 먼저 완성한다.

## 10. 상세 명세 연결

- [프로젝트 문서 색인](./README.md)
- [제품 범위·권한·성공 지표](./01-product-requirements.md)
- [UI 시안과 추가 화면](./02-ux-screen-flows.md)
- [모노레포·Spring 모듈·비동기 구조](./03-system-architecture.md)
- [엔티티·상태 전이·REST API](./04-domain-data-api.md)
- [만족도 수식·양보 원장·Bedrock 제한](./05-ai-fairness.md)
- [AWS·CI/CD·Docker/ECS 이전](./06-deployment-operations.md)
- [상세 테스트·인수 시나리오·출시 게이트](./07-roadmap-testing.md)
- [0~1단계 실행 백로그](./08-execution-backlog.md)
