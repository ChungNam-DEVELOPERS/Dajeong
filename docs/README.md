# 다정 프로젝트 설계 문서

> 상태: 구현 기준선 v1.0
>
> 작성일: 2026-08-18
>
> 대상: 대전 지역 3~6인 그룹 여행 공개 베타

다정은 여행 중 날씨, 휴관, 교통 문제로 기존 일정에 차질이 생겼을 때 구성원의 비공개 선호와 이전 양보 이력을 반영해 대체 일정 후보를 만들고, 익명 투표로 합의를 돕는 서비스다.

이번 문서 세트는 구현 전에 확정한 제품·기술 기준이다. 충돌이 생기면 이 문서의 결정이 원본 PDF의 미확정 문구나 UI 예시보다 우선한다.

## 문서 읽기 순서

1. [종합 개발 계획](./00-development-plan.md) - 개발 순서와 단계별 완료 조건
2. [제품 요구사항](./01-product-requirements.md)
3. [UX와 화면 흐름](./02-ux-screen-flows.md)
4. [시스템 아키텍처](./03-system-architecture.md)
5. [도메인·데이터·API](./04-domain-data-api.md)
6. [AI와 공정성](./05-ai-fairness.md)
7. [배포와 운영](./06-deployment-operations.md)
8. [로드맵과 테스트](./07-roadmap-testing.md)
9. [0~1단계 실행 백로그](./08-execution-backlog.md) - 다음 10개 개발일의 작업 순서·완료 조건·검증 증거
10. [외부 서비스·비밀정보 대장](./09-external-services.md) - 신청 상태·할당량·환경 변수·보관 위치
11. [환경 설정 계약](./10-environment-configuration.md) - 환경별 활성 변수·공개 경계·검증 명령

## 확정 결정

| 항목 | 결정 |
| --- | --- |
| 제품 범위 | 기존 일정의 재조정. 초기 여행 전체 생성은 제외 |
| 지역·언어 | 대전, 한국어만 지원 |
| 사용자 | 친구·가족·연인으로 구성된 3~6인 그룹 |
| 플랫폼 | Next.js 웹과 React Native 앱에 동일한 핵심 기능 제공 |
| 웹 | Next.js 15 App Router, AWS Amplify Hosting |
| 앱 | Expo 기반 React Native, Expo Router, EAS Build/Submit |
| API | Java 21, Spring Boot 4.1, Gradle, REST `/api/v1` |
| 데이터 | PostgreSQL 16, Flyway, 변경 이력형 일정 버전 |
| 인증 | Amazon Cognito, 카카오 OIDC, Apple, Google |
| AI | Amazon Bedrock. 결정론 코드 우선, AI는 제한적 보조 |
| 자동 감지 | 강수확률 60% 이상인 날씨만 자동 감지 |
| 투표 | 전원 참여 또는 12시간 후 종료, 익명 선택 |
| 공정성 | 최저 만족도 우선 + 양보 원장 가중치 |
| 초기 API 배포 | Spring Boot JAR를 Elastic Beanstalk에 배포 |
| 후속 배포 | Docker/ECR/ECS Fargate로 이전 |

## 기준 자료

- 원본 설계: 별도 보관(저장소 미포함)
- UI 시안: [`../ui`](../ui)
- TourAPI: `KorService2`만 사용
- 기상청 단기예보: 강수확률 기반 자동 트리거
- ODsay: 공개 베타 동안 Basic 사용 후 유료 전환 검토

## 변경 원칙

- 범위를 바꾸는 결정은 관련 문서와 이 색인을 같은 변경에서 갱신한다.
- API나 상태 전이를 바꾸면 웹·앱 계약과 테스트 기준도 함께 바꾼다.
- 개인 선호, 피로도, 예산, 개인별 투표 내역은 그룹 공개 데이터로 승격하지 않는다.
- 데이터가 없거나 외부 API가 확인하지 못한 내용은 추정하지 않고 `정보 없음`으로 표현한다.
