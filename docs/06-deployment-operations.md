# 배포와 운영

## 1. 환경

| 환경 | 용도 | 구성 |
| --- | --- | --- |
| Local | 개발 | 로컬 Spring·웹·앱, Docker Compose PostgreSQL |
| Staging | 통합·스토어 심사 전 검증 | 축소된 AWS 환경, 테스트 소셜 앱·API 키 |
| Production | 공개 베타 | 서울 리전, 실제 도메인·소셜 앱·데이터 키 |

Staging과 Production의 DB, Cognito User Pool, 외부 API 키를 공유하지 않는다.

## 2. 초기 AWS 구성

- 리전: `ap-northeast-2`를 기본으로 한다.
- 웹: AWS Amplify Hosting에 Next.js 15를 배포한다.
- API·워커: Elastic Beanstalk Java SE/AL2023에 실행 가능한 JAR를 배포한다.
- 데이터: 암호화된 RDS PostgreSQL 16 Single-AZ, 자동 백업 7일, 삭제 방지 활성화.
- 인증: Cognito User Pool과 카카오 OIDC·Apple·Google 공급자.
- 작업: `weather-poll`, `replan-jobs`, `vote-deadline`, `retention-cleanup` SQS와 각각의 DLQ.
- 스케줄: EventBridge Scheduler가 30분마다 날씨 검사, 1분마다 투표 마감, 매일 민감정보 정리 메시지를 발행한다.
- AI: Amazon Bedrock과 최소 권한 IAM 역할.
- 비밀: Secrets Manager, 비민감 설정은 SSM Parameter Store.
- 관측: CloudWatch Logs·Metrics·Alarms, AWS Budgets.
- DNS·TLS: 도메인 확보 전 Amplify·Beanstalk 기본 주소, 이후 Route 53과 ACM.

공개 베타는 비용을 위해 API·DB 단일 인스턴스 장애 위험을 수용한다. 정식 출시 전 Multi-AZ DB와 최소 2개 API 태스크를 요구한다.

## 3. Infrastructure as Code

AWS CDK TypeScript가 네트워크, 보안 그룹, RDS, Cognito, SQS, EventBridge, IAM, 알람을 관리한다. 콘솔 수동 변경은 긴급 조치만 허용하고 다음 배포 전에 CDK에 반영한다.

권한은 웹 빌드, API 런타임, CI 배포, 운영자 역할로 분리한다. API 런타임은 필요한 큐·비밀·Bedrock 모델·로그에만 접근한다.

CDK 스택은 `dajeong-<environment>-<purpose>`, 리소스는 `dajeong-<environment>-<resource>` 형식으로 이름을 붙인다. 모든 태그 가능 리소스에 `Project`, `Environment`, `ManagedBy`, `Repository` 태그를 적용하고 Staging과 Production의 VPC CIDR를 분리한다. 재현 명령과 실제 계정 diff 선행 조건은 [`infra/cdk/README.md`](../infra/cdk/README.md)를 따른다.

## 4. CI/CD

### Branch flow

- Issue별 `feat/*`, `fix/*`, `chore/*` 브랜치는 `dev`에서 만들고 PR로 다시 `dev`에 squash merge한다.
- `dev`는 통합·Staging 기준 브랜치다. 실제 staging 자동 배포는 CDK·OIDC가 준비된 뒤 `dev` push에 연결한다.
- Production 릴리스는 `dev → main` PR로만 진행하고 장기 브랜치의 조상 관계를 유지하도록 merge commit을 사용한다.
- 긴급 수정은 `main`에서 `hotfix/*`를 만들고 Production 반영 뒤 같은 변경을 `dev`에도 동기화한다.

### Pull request

- PR 제목, 대상 브랜치, Issue 기반 브랜치 이름을 검사한다.
- Markdown 링크·형식 검사
- 환경 설정 계약·필수값 실패 케이스·추적 파일 secret 패턴 검사
- TypeScript lint·typecheck·unit test
- Spring compile·unit·integration test
- OpenAPI 생성 후 변경 여부 검사
- 웹 production build와 Expo export smoke test
- 의존성·비밀·컨테이너가 추가된 이후 이미지 취약점 검사

### 의존성 보안

PR CI는 `pnpm check:dependency-security`로 전이 의존성의 로컬 보안 패치, 노출 범위 가정, `pnpm audit --audit-level moderate`를 함께 검증한다. 감사 예외는 GHSA별 근거와 제거 조건이 있는 경우에만 `pnpm-workspace.yaml`에 등록한다.

PR CI는 clean checkout에서 고정된 pnpm lockfile로 의존성을 설치한 뒤 루트 `pnpm check`만 실행한다. 이 단일 진입점이 Markdown, 환경·비밀값 계약, Spring·OpenAPI, workspace lint·typecheck·test, Next.js build와 Expo web export를 로컬과 같은 순서로 검증한다.

| GHSA | 현재 완화 | 예외 제거 조건 |
| --- | --- | --- |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | `image-size@1.2.1`의 ICNS 파일·엔트리 길이를 검증하는 pnpm 패치와 악성 입력 회귀 테스트 | Expo·Metro가 해당 수정이 포함된 안전 버전을 제공할 때 패치와 예외를 함께 제거 |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | 8바이트보다 짧은 ISO 이미지 박스를 거부하는 pnpm 패치와 JXL·HEIF 회귀 테스트 | Expo·Metro가 해당 수정이 포함된 안전 버전을 제공할 때 패치와 예외를 함께 제거 |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Expo의 `xcode@3.0.1`은 영향 함수인 UUID v3·v5·v6 및 호출자 버퍼를 사용하지 않고 `uuid.v4()`만 호출함을 회귀 테스트로 고정 | `xcode`가 `uuid@11.1.1` 이상 호환 범위를 제공하면 예외를 제거하고 정상 업데이트 |

`image-size` 패치는 [Issue #21](https://github.com/ChungNam-DEVELOPERS/Dajeong/issues/21)에서 추적한다. 감사 결과를 숨기기 위한 존재하지 않는 버전 지정이나 상위 패키지 지원 범위를 벗어난 메이저 override는 사용하지 않는다.

### Dev 배포

- `dev` 갱신과 필수 CI 통과 후 staging 환경을 배포한다.
- 배포 후 웹·API liveness와 CORS smoke를 실행한다.
- 현재는 AWS CDK·OIDC 기반이 준비되지 않아 이 자동 배포를 활성화하지 않는다.
- CDK 로컬 synth·template diff는 준비됐지만 EXT-02와 Staging 계정 diff·OIDC 인증이 남아 있으므로 자동 배포는 계속 비활성화한다.

### Main 배포

- `main` 갱신은 승인된 `dev → main` 릴리스 PR 또는 긴급 `hotfix/*` PR로 제한한다.
- Amplify가 `apps/web`을 자동 배포한다.
- GitHub Actions OIDC가 Spring JAR를 S3에 올리고 Beanstalk application version을 갱신한다.
- Flyway는 애플리케이션 시작 시 잠금을 잡고 한 번만 실행한다.
- 배포 후 `/actuator/health/readiness`와 핵심 API smoke test가 실패하면 이전 버전으로 되돌린다.
- 앱은 Git 태그에서 EAS production build를 만들고 검증 후 수동 승인으로 App Store·Play Store에 제출한다.

## 5. 보안·백업·개인정보 운영

- 모든 외부 통신은 TLS, DB는 private subnet에서만 접근한다.
- CORS는 배포된 웹 도메인만 허용하고 보안 헤더와 API rate limit을 적용한다.
- JWT·소셜 secret·외부 API key는 클라이언트 번들·로그에 포함하지 않는다.
- RDS 자동 백업 복구를 분기마다 staging에서 시험한다.
- 계정 삭제, 여행 종료 30일 삭제, 푸시 토큰 만료 정리를 매일 실행한다.
- 개인정보처리방침에는 사용 목적, 보존 기간, 외부 AI 처리, 계정 삭제 절차를 명시한다.

## 6. 알람과 비용 보호

- API 5xx 비율 5분간 5% 초과
- 후보 생성 p95 60초 초과
- SQS 가장 오래된 메시지 5분 초과 또는 DLQ 1건 이상
- RDS 저장공간 20% 미만, CPU 80% 초과
- ODsay 일일 호출 80%, Bedrock 일일 예산 80%, AWS 월 예산 80%

ODsay Basic의 6개월 종료 또는 호출 한도 접근 4주 전에 Standard 계약이나 대체 공급자를 결정한다.

## 7. Docker와 ECS 이전

1. Spring JAR를 비루트 사용자·read-only filesystem으로 실행하는 멀티스테이지 Dockerfile을 만든다.
2. GitHub Actions에서 이미지를 빌드·검사하고 ECR에 commit SHA로 푸시한다.
3. 같은 이미지를 API용 ECS Service와 SQS 워커용 ECS Service로 실행한다.
4. API는 ALB 뒤에 두고 워커는 public ingress 없이 큐만 소비한다.
5. Flyway는 ECS one-off migration task로 분리한다.
6. staging에서 부하·롤백을 검증한 뒤 DNS를 ECS ALB로 전환한다.
7. 안정화 후 Beanstalk를 종료한다. RDS·Cognito·SQS·API 계약은 변경하지 않는다.

## 8. 도메인과 앱 링크

도메인 소유가 확인되기 전 웹은 Amplify 기본 URL, 앱은 `dajeong://` custom scheme을 쓴다. 도메인을 확보하면 `app.<domain>`, `api.<domain>`, `/join/{code}` Universal Link·Android App Link를 추가하고 기존 custom scheme을 호환 경로로 유지한다.

## 9. 운영 근거

- [Elastic Beanstalk Java 애플리케이션 배포](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/java-quickstart.html)
- [EventBridge Scheduler 일정 관리](https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule.html)
- [TourAPI `KorService2` 전환 안내](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004082)
- [ODsay Basic·Standard 이용 조건](https://lab.odsay.com/contact/contact?act=srvc)
