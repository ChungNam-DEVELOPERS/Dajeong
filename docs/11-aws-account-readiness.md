# AWS 계정 준비

> 상태: EXT-02 외부 인증 대기
>
> 최종 확인일: 2026-08-20
>
> 원칙: 계정 ID, ARN, SSO URL, 이메일 주소, 자격 증명 값은 문서와 작업 로그에 기록하지 않는다.

이 문서는 실제 Staging 계정에 CDK change set을 만들기 전에 필요한 계정 보호, 비용 알림, 사람과 자동화의 권한 분리를 정의한다. 현재 개발 환경에는 AWS CLI v2가 준비됐지만 named profile과 AWS 콘솔 세션이 없어 실제 계정 검사는 아직 실행하지 않았다.

## 1. 통과 조건

| 영역 | 통과 조건 | 검사 방식 |
| --- | --- | --- |
| root 보호 | root MFA 활성화, root access key 0개 | IAM 계정 요약 조회 |
| 사람 인증 | IAM Identity Center `sso_session`을 연결한 named profile | 로컬 AWS CLI 설정 조회 |
| 리전 | profile 기본 리전 `ap-northeast-2` | 로컬 AWS CLI 설정 조회 |
| 호출자 | root·IAM user가 아닌 임시 assumed role | STS 호출자 조회 |
| 비용 보호 | 양수 한도의 월간 `COST` 예산 | AWS Budgets 조회 |
| 비용 알림 | 실제 지출이 예산의 80%를 넘을 때 EMAIL 또는 SNS 알림 | AWS Budgets 알림·수신자 조회 |
| 권한 분리 | 사람 개발 역할과 GitHub Actions 배포 역할 분리 | 아래 역할 계획 검토 |

검사기는 조회만 수행한다. 계정 ID는 AWS Budgets 요청에 메모리상으로 전달하지만 결과에 출력하지 않으며, ARN과 알림 수신자도 출력하지 않는다.

## 2. 권한 분리 계획

| 주체 | 인증 | 허용 범위 | 금지 |
| --- | --- | --- | --- |
| 계정 소유자 | root + MFA | 계정 복구와 root 전용 작업 | 일상 개발, access key 생성 |
| 계정 준비 담당자 | IAM Identity Center 임시 역할 | MFA·비용·Identity Center 초기 설정과 bootstrap 승인 작업 | 장기 access key, 애플리케이션 일상 배포 |
| 개발자 | IAM Identity Center 임시 역할 | Staging 조회, synth, 승인된 diff에 필요한 최소 권한 | Production 변경, IAM 관리, 장기 access key |
| GitHub Actions | GitHub OIDC 임시 역할 | FND-16에서 정의할 Staging 배포 최소 권한 | 콘솔 로그인, 사람의 역할 재사용, 정적 secret |
| 런타임 | 서비스별 IAM role | 큐·비밀·로그·Bedrock 등 실행에 필요한 리소스 | 배포·청구·사람 관리 |

GitHub Actions 역할의 trust는 해당 저장소와 `dev`의 Staging 환경으로 제한한다. 실제 정책과 허용·거부 smoke는 FND-16에서 CDK로 구현한다.

## 3. 계정 소유자가 먼저 할 일

1. root 사용자 MFA를 활성화하고 복구 수단을 안전하게 보관한다.
2. root access key가 있으면 비활성화 후 사용처를 확인하고 삭제한다.
3. IAM Identity Center를 활성화하고 계정 준비 담당자와 개발자 permission set을 분리한다.
4. 월간 `COST` 예산의 금액과 통화를 실제 소유자가 결정한다.
5. `ACTUAL`, `PERCENTAGE`, `GREATER_THAN`, 임계값 `80` 알림과 EMAIL 또는 SNS 수신자를 등록한다.

예산 금액과 수신자는 저장소에 기록하지 않는다. 등록·수정은 계정과 비용에 영향을 주는 외부 변경이므로 담당자의 명시적 결정 후 수행한다.

## 4. SSO profile 준비

계정 준비 담당자가 본인 터미널에서 실행한다.

```bash
aws configure sso
aws sso login --profile <staging-profile>
```

대화형 설정에서는 다음 값만 입력한다.

- IAM Identity Center에서 확인한 start URL 또는 issuer URL
- Identity Center가 위치한 SSO 리전
- 대상 Staging 계정과 준비 담당자 역할
- 기본 client 리전 `ap-northeast-2`
- 출력 형식 `json`
- 의미가 분명한 named profile

SSO URL, 계정 번호, 사용자 이메일과 역할 세부 식별자는 채팅, Issue, PR, CI 로그에 붙여 넣지 않는다.

## 5. 비파괴 검사

저장소 루트에서 실행한다.

```bash
pnpm check:aws-account -- --profile <staging-profile>
```

또는 현재 shell에 profile 이름만 지정한다.

```bash
DAJEONG_AWS_PROFILE=<staging-profile> pnpm check:aws-account
```

검사 역할에는 다음 조회 권한이 필요하다.

- `iam:GetAccountSummary`
- `budgets:ViewBudget`
- `billing:GetBillingViewData`

`sts:GetCallerIdentity`는 호출자 확인에 사용한다. AWS Budgets API는 애플리케이션 기본 리전과 별도로 `us-east-1` endpoint에서 조회한다.

출력 상태는 다음과 같다.

- `PASS`: 조건을 확인했다.
- `FAIL`: 조건이 없거나 조회할 수 없다. 프로세스가 종료 코드 1을 반환한다.
- `SKIP`: 선행 인증이나 예산 조건을 먼저 해결해야 한다.

검사 실패 시 raw AWS CLI 오류를 그대로 공유하지 않는다. SSO 만료라면 다시 로그인하고, IAM 또는 Budgets 조회 실패라면 위의 조회 권한과 Billing 접근 설정을 계정 준비 담당자가 확인한다.

## 6. 다음 게이트

모든 항목이 `PASS`가 된 뒤 다음 순서로 진행한다.

1. EXT-02를 `DONE`으로 바꾸고 식별자 없는 검증 결과만 기록한다.
2. `cdk bootstrap`의 생성 리소스와 비용 영향을 검토하고 별도 배포 승인을 받는다.
3. `ap-northeast-2`를 bootstrap한다.
4. CloudFormation change set 방식의 실제 Staging `cdk diff`를 실행한다.
5. FND-15를 닫고 FND-16 GitHub Actions OIDC 역할을 구현한다.

`cdk bootstrap`과 `cdk deploy`는 이 문서의 검사 명령에 포함되지 않는다.

## 7. AWS 공식 근거

- [root 사용자 보호 모범 사례](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html)
- [IAM 보안 모범 사례](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CLI의 IAM Identity Center 설정](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [IAM 계정 요약 API](https://docs.aws.amazon.com/IAM/latest/APIReference/API_GetAccountSummary.html)
- [AWS Budgets 80% 알림 예시](https://docs.aws.amazon.com/cli/latest/reference/budgets/describe-notifications-for-budget.html)
- [AWS Budgets 권한](https://docs.aws.amazon.com/service-authorization/latest/reference/list_budgets.html)
- [AWS CDK bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)
