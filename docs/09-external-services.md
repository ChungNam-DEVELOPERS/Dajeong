# 외부 서비스·비밀정보 대장

> 상태: 운영 기준선 v1.0
>
> 작성일: 2026-08-18
>
> 원칙: 이 문서에는 secret, token, API key, 계정 ID의 **실제 값을 절대 기록하지 않는다.**

이 문서는 외부 서비스의 신청·승인·할당량·만료 상태와 환경 변수명, 보관 위치만 관리한다. 실제 자격 증명은 로컬 비밀 저장소 또는 AWS 비밀 저장소에만 둔다.

## 1. 상태 값

| 상태 | 의미 |
| --- | --- |
| `NOT_CHECKED` | 계정·신청 여부를 아직 확인하지 않음 |
| `APPLIED` | 신청을 접수함 |
| `WAITING` | 외부 심사나 승인 대기 중 |
| `APPROVED` | 개발 환경에서 사용 가능 |
| `MOCK_READY` | 실제 연동 전에도 mock으로 개발 가능 |
| `BLOCKED` | 현재 사용 불가이며 대안 결정이 필요 |

## 2. 서비스 상태

| 서비스 | 용도 | 상태 | 할당량·만료 확인 | 다음 행동 |
| --- | --- | --- | --- | --- |
| AWS | staging·production 인프라 | `NOT_CHECKED` | Budget 80% 알림 설정 필요 | MFA, 청구, 서울 리전, 권한 구조 확인 |
| Kakao Developers | Cognito OIDC 로그인 | `NOT_CHECKED` | 동의 항목·심사 조건 확인 | 개발용 앱과 callback placeholder 등록 |
| Google Cloud OAuth | Cognito OIDC 로그인 | `NOT_CHECKED` | 테스트 사용자·게시 상태 확인 | 웹·앱 client 구분 기록 |
| Apple Developer | Sign in with Apple·iOS 배포 | `NOT_CHECKED` | 가입·심사·갱신일 확인 | identifier·key 필요 목록 기록 |
| TourAPI `KorService2` | 대전 장소 검색 | `NOT_CHECKED` | 일일 할당량·이용조건 확인 | 활용 신청과 예제 응답 보존 |
| 기상청 단기예보 | 강수확률 자동 감지 | `NOT_CHECKED` | 일일 할당량·발표 주기 확인 | 활용 신청과 예제 응답 보존 |
| ODsay Basic | 대중교통 이동시간 | `NOT_CHECKED` | 일일 한도·계약 시작일로부터 6개월 종료 확인 | 신청 후 종료 예정일 기록 |
| Amazon Bedrock | 제한된 구조화·설명 생성 | `NOT_CHECKED` | 모델 접근·일일 예산 상한 확인 | 서울 리전 후보 모델 기록 |
| Expo·EAS | 앱 build·push·submit | `NOT_CHECKED` | organization·plan 한도 확인 | 계정과 project ID 후보 확인 |
| App Store Connect | iOS 심사·배포 | `NOT_CHECKED` | 가입·세금·계약 상태 확인 | bundle ID·심사 계정 계획 기록 |
| Google Play Console | Android 심사·배포 | `NOT_CHECKED` | 가입·신원확인 상태 확인 | package ID·심사 계정 계획 기록 |

## 3. 설정·비밀정보 이름

이 표는 현재 값뿐 아니라 후속 기능에서 사용할 예정인 이름도 포함한다. 지금 빌드와 실행에 필요한 활성 변수, 공개 경계, 환경별 주입 위치는 [`10-environment-configuration.md`](./10-environment-configuration.md)를 기준으로 한다.

| 영역 | 이름 | secret | Local | Staging·Production |
| --- | --- | --- | --- | --- |
| 공통 | `AWS_REGION` | 아님 | `.env.local` 예정 | SSM Parameter Store |
| 공통 | `API_BASE_URL` | 아님 | `.env.local` 예정 | 플랫폼 환경 설정 |
| Web | `NEXT_PUBLIC_API_BASE_URL` | 아님 | `apps/web/.env.local` | Amplify 환경 설정 |
| Mobile | `EXPO_PUBLIC_API_BASE_URL` | 아님 | `apps/mobile/.env.local` | EAS environment |
| Cognito | `COGNITO_USER_POOL_ID` | 아님 | 로컬 mock 설정 | SSM Parameter Store |
| Cognito | `COGNITO_CLIENT_ID` | 아님 | 로컬 mock 설정 | SSM Parameter Store |
| Kakao | `KAKAO_OIDC_CLIENT_ID` | 아님 | 비밀 저장소 참조 | Secrets Manager |
| Kakao | `KAKAO_OIDC_CLIENT_SECRET` | 맞음 | 비밀 저장소 | Secrets Manager |
| Google | `GOOGLE_OIDC_CLIENT_ID` | 아님 | 비밀 저장소 참조 | Secrets Manager |
| Google | `GOOGLE_OIDC_CLIENT_SECRET` | 맞음 | 비밀 저장소 | Secrets Manager |
| Apple | `APPLE_SERVICE_ID` | 아님 | 비밀 저장소 참조 | SSM Parameter Store |
| Apple | `APPLE_TEAM_ID` | 아님 | 비밀 저장소 참조 | SSM Parameter Store |
| Apple | `APPLE_KEY_ID` | 아님 | 비밀 저장소 참조 | SSM Parameter Store |
| Apple | `APPLE_PRIVATE_KEY` | 맞음 | 비밀 저장소 | Secrets Manager |
| TourAPI | `TOUR_API_KEY` | 맞음 | 비밀 저장소 | Secrets Manager |
| 기상청 | `KMA_API_KEY` | 맞음 | 비밀 저장소 | Secrets Manager |
| ODsay | `ODSAY_API_KEY` | 맞음 | 비밀 저장소 | Secrets Manager |
| Bedrock | `BEDROCK_MODEL_ID` | 아님 | `.env.local` 예정 | SSM Parameter Store |
| Bedrock | AWS 실행 권한 | 키 없음 | AWS SSO profile | IAM role |
| Expo | `EXPO_TOKEN` | 맞음 | 비밀 저장소 | GitHub Environment secret |
| Expo | `EXPO_PROJECT_ID` | 아님 | 앱 설정 | EAS project config |
| App Store | `ASC_KEY_ID` | 아님 | 비밀 저장소 참조 | GitHub Environment secret |
| App Store | `ASC_ISSUER_ID` | 아님 | 비밀 저장소 참조 | GitHub Environment secret |
| App Store | `ASC_PRIVATE_KEY` | 맞음 | 비밀 저장소 | GitHub Environment secret |
| Google Play | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | 맞음 | 비밀 저장소 | GitHub Environment secret |

## 4. 보관·기록 규칙

- `.env`, `.env.*`, `*.local`은 Git에 추가하지 않는다. `.env.example`에는 공개 로컬 값이나 `local-only`로 명시한 안전한 예제만 두고 실제 secret은 넣지 않는다.
- 로컬 개발은 OS 비밀 저장소 또는 전용 비밀 관리자를 사용한다. 평문 메모나 shell history에 실제 값을 남기지 않는다.
- staging·production 런타임 secret은 Secrets Manager, 비민감 설정은 SSM Parameter Store로 분리한다.
- GitHub Actions의 AWS 인증은 OIDC 단기 자격 증명만 쓴다. `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`를 repository secret으로 만들지 않는다.
- 스크린샷, CI 로그, 예제 응답, mock fixture에서 키·토큰·계정 식별자를 제거한다.
- 실제 값을 발급·교체·폐기할 때는 일자, 환경, 상태, 다음 교체일만 이 대장에 기록한다.

## 5. 변경 기록

| 날짜 | 영역 | 변경 | 다음 확인 |
| --- | --- | --- | --- |
| 2026-08-18 | 전체 | 서비스 대장과 환경 변수 보관 기준 생성 | EXT-02 AWS 계정·비용 보호 |
