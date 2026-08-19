# Dajeong AWS CDK

`infra/cdk`는 Dajeong의 AWS desired state를 TypeScript로 관리한다. 현재 범위는 FND-15의 네트워크 기반이며 실제 배포는 포함하지 않는다.

## 환경 규칙

| 환경 | 스택 | 리전 | VPC CIDR |
| --- | --- | --- | --- |
| Staging | `dajeong-staging-foundation` | `ap-northeast-2` | `10.20.0.0/16` |
| Production | `dajeong-production-foundation` | `ap-northeast-2` | `10.30.0.0/16` |

리소스 이름은 `dajeong-<environment>-<purpose>` 형식을 사용한다. 태그는 `Project`, `Environment`, `ManagedBy`, `Repository`를 필수로 적용한다. 계정 ID는 코드나 문서에 기록하지 않고 AWS profile에서 해석한다.

기반 스택은 다음 리소스만 관리한다.

- 2개 Availability Zone의 public subnet과 isolated data subnet
- 인터넷 게이트웨이와 public route
- NAT Gateway가 없는 VPC
- 기본 보안 그룹의 모든 기본 규칙을 제거하는 CDK Custom Resource

RDS, Cognito, 큐, API 런타임과 웹 호스팅은 후속 스택에서 추가한다.

## 로컬 검증

저장소 루트에서 실행한다.

```bash
pnpm --filter @dajeong/cdk lint
pnpm --filter @dajeong/cdk typecheck
pnpm --filter @dajeong/cdk test
pnpm --filter @dajeong/cdk synth
pnpm --filter @dajeong/cdk synth:production
pnpm --filter @dajeong/cdk diff:offline
```

`synth`는 AWS 자격 증명 없이 Staging CloudFormation 템플릿을 `infra/cdk/cdk.out/staging`에 생성한다. `diff:offline`은 빈 로컬 템플릿과 비교해 최초 생성 시 추가될 리소스만 표시한다. 실제 계정 상태를 읽지 않으므로 Staging account diff의 대체 증거로 사용하지 않는다.

## 실제 Staging diff

다음 조건이 모두 준비된 뒤에만 실행한다.

1. EXT-02의 MFA, 비용 알림, 권한 분리를 확인한다.
2. AWS CLI와 Staging용 SSO profile을 준비한다.
3. 계정 준비 상태 검사를 통과한다.
4. 별도 배포 승인을 받은 뒤 대상 계정의 `ap-northeast-2`를 CDK bootstrap한다.
5. 아래 명령으로 CloudFormation change set 기반 diff를 확인한다.

```bash
pnpm check:aws-account -- --profile <staging-profile>
pnpm --filter @dajeong/cdk diff:staging -- --profile <staging-profile>
```

`cdk bootstrap`은 `CDKToolkit` 스택과 배포용 리소스를 생성하는 배포 작업이다. `diff`는 애플리케이션 배포 명령이 아니지만 change set 생성 권한이 필요하다. `cdk bootstrap`과 `cdk deploy`는 별도 승인 없이 실행하지 않는다. 출력과 진행 기록에는 profile 이름, 계정 ID, ARN 같은 계정 식별 정보를 남기지 않는다.
