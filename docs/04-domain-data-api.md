# 도메인·데이터·API

## 1. 핵심 모델

| 엔티티 | 주요 필드·규칙 |
| --- | --- |
| `User` | Cognito `sub`, 표시 이름, 상태, 생성·탈퇴 시각 |
| `Trip` | 제목, 대전 고정 지역, 시작·종료일, 방장, 상태 |
| `Membership` | 여행·사용자, `HOST`/`MEMBER`, 활성 상태. 여행당 최대 6명 |
| `Invite` | 해시된 코드, 만료 시각, 폐기 시각. 평문 코드는 생성 응답에서만 제공 |
| `ItineraryDraft` | 여행별 현재 초안 revision과 마지막 발행 revision. 편집은 방장만 가능 |
| `ItineraryVersion` | 여행, 버전 번호, `ORIGINAL/REPLAN` 생성 원인, 이전 버전, 확정 시각 |
| `ItinerarySlot` | 날짜·시간, 장소, 좌표, 실내외, 범주, 비용, 출처 |
| `PrivatePreference` | 멤버별 최신 원본 응답. 본인과 계산 서비스만 접근 |
| `ConcessionLedger` | 멤버별 0~100 양보 점수와 갱신 근거 |
| `Disruption` | 슬롯, `WEATHER/CLOSURE/TRAFFIC/OTHER`, 출처, 상태 |
| `ProposalSet` | 생성 작업, 후보 버전, 마감·승자·적용 버전, 상태, 입력 스냅샷 해시 |
| `Proposal` | 변경 슬롯, 검증 데이터, 멤버별 비공개 만족도, 그룹 요약 |
| `Vote` | 후보 세트·멤버당 한 행, 선택 후보, 갱신 시각 |
| `Notification` | 사용자, 종류, 이동 대상, 읽음 시각 |
| `OutboxEvent` | 이벤트 종류, payload, 발행·재시도 상태 |

모든 엔티티는 UTC로 저장하고 사용자에게는 Asia/Seoul로 표시한다. 금액은 원 단위 정수, 좌표는 WGS84를 사용한다.

## 2. 상태 전이

### Trip

`DRAFT → ACTIVE → COMPLETED → ARCHIVED`

- 멤버 3명 이상, 기존 일정 1개 이상, 방장 선호 제출 완료 시 `ACTIVE`로 전환할 수 있다.
- 종료일이 지나면 `COMPLETED`, 민감정보 삭제 후 `ARCHIVED`가 된다.

### Disruption

`DETECTED → ACKNOWLEDGED → GENERATING → VOTING → APPLIED`

대안 경로는 `DETECTED/ACKNOWLEDGED → DISMISSED`, 생성 실패는 `GENERATING → FAILED`다. 실패 후 새 작업을 만들 수 있지만 같은 멱등 키 작업을 중복 실행하지 않는다.

### ProposalSet

`QUEUED → GENERATING → OPEN → CLOSED → APPLIED`

후보가 없으면 `FAILED`, 0표로 마감되거나 원본 일정이 더 최신이면 `CANCELLED`다. `CLOSED`에서 승자 적용까지는 같은 트랜잭션에서 수행하므로 외부에는 완료된 `APPLIED`로 관찰된다.

## 3. REST API

모든 경로는 `/api/v1` 기준이며 JSON을 사용한다.

### 사용자·여행·초대

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/me` | 내 프로필과 계정 상태 |
| `DELETE` | `/me` | 계정 삭제 요청 |
| `POST` | `/trips` | 여행 생성 |
| `GET` | `/trips` | 내 여행 목록 |
| `GET/PATCH` | `/trips/{tripId}` | 여행 조회·방장 수정 |
| `POST` | `/trips/{tripId}/invites` | 초대 코드 발급·기존 코드 폐기 |
| `POST` | `/invites/{code}/join` | 로그인 사용자 가입 |
| `DELETE` | `/trips/{tripId}/members/{memberId}` | 방장 멤버 내보내기 또는 본인 탈퇴 |

### 일정·선호

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/trips/{tripId}/itineraries/current` | 현재 확정 버전 조회 |
| `GET` | `/trips/{tripId}/itineraries/draft` | 방장의 현재 초안과 revision 조회 |
| `POST` | `/trips/{tripId}/itineraries/draft/slots` | 방장 슬롯 추가 |
| `PATCH/DELETE` | `/trips/{tripId}/itineraries/draft/slots/{slotId}` | 방장 슬롯 변경·삭제 |
| `POST` | `/trips/{tripId}/itineraries/draft/publish` | 기존 일정 기준 버전 발행 |
| `PUT/GET` | `/trips/{tripId}/preferences/me` | 내 선호 저장·조회 |
| `GET` | `/trips/{tripId}/preferences/status` | 멤버별 제출 여부만 조회 |

### 변수·후보·투표

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/trips/{tripId}/disruptions` | 수동 문제 신고 |
| `GET` | `/trips/{tripId}/disruptions` | 문제 목록 |
| `POST` | `/disruptions/{id}/dismiss` | 원본 일정 유지 |
| `POST` | `/disruptions/{id}/replans` | 후보 생성, `202 Accepted` |
| `GET` | `/proposal-sets/{id}` | 생성 상태·후보·집계 조회 |
| `PUT` | `/proposal-sets/{id}/vote` | 내 투표 생성·변경 |
| `DELETE` | `/proposal-sets/{id}/vote` | 마감 전 내 투표 철회 |
| `GET` | `/notifications` | 내 알림 목록 |
| `POST` | `/notifications/{id}/read` | 읽음 처리 |
| `PUT/DELETE` | `/push-tokens/{tokenId}` | 앱 푸시 토큰 등록·해제 |

## 4. 공통 계약

- 재시도로 중복이 생길 수 있는 생성·발행 요청은 `Idempotency-Key`를 받는다.
- 일정 슬롯 추가·변경·삭제와 발행은 `If-Match`에 초안 revision을 보내며 불일치 시 `409 Conflict` 및 `STALE_VERSION`을 반환한다.
- 목록은 cursor pagination을 사용한다.
- 오류 형식은 RFC 9457 Problem Details를 사용하고 `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId`를 포함한다.
- 주요 코드는 `AUTH_REQUIRED`, `FORBIDDEN`, `INVITE_EXPIRED`, `TRIP_FULL`, `STALE_VERSION`, `VOTE_CLOSED`, `NO_VOTES`, `UPSTREAM_UNAVAILABLE`, `QUOTA_EXCEEDED`, `NO_FEASIBLE_PROPOSAL`이다.

### 일정 초안·발행 규칙

- `DRAFT`·`ACTIVE` 여행의 방장은 장소명, 주소, 시작·종료 시각, 분류, 실내외, 예상 비용을 직접 입력한다. 좌표는 위도·경도를 함께 입력하거나 둘 다 생략한다.
- 슬롯은 여행 기간 안에 있어야 하고 동일 초안의 다른 슬롯과 시간이 겹치지 않아야 한다. 시간은 UTC로 저장하고 웹 입력·표시는 `Asia/Seoul`을 사용한다.
- 발행은 현재 초안을 `ORIGINAL` 원인의 불변 버전으로 복사한다. 발행 후 편집은 다음 revision에만 반영되며 이전 버전을 바꾸지 않는다.
- 활성 멤버는 현재 확정 버전을 볼 수 있지만 초안은 볼 수 없다. 아직 발행된 버전이 없으면 `404` 및 `ITINERARY_NOT_PUBLISHED`를 반환한다.

## 5. 투표와 적용 규칙

- 전원이 투표하면 즉시 닫고, 그렇지 않으면 `openedAt + 12시간`에 닫는다.
- 투표 자격은 후보 생성 시 개인 점수가 생성됐고 현재도 활성인 멤버로 고정해, 투표 중 신규 가입자가 점수 없이 결과에 포함되지 않게 한다.
- 마감 시 1표 이상이면 최다 득표 후보를 선택한다. 0표이면 원본 일정을 유지하고 `CANCELLED` 처리한다.
- 동률은 [AI와 공정성](./05-ai-fairness.md)의 결정론 순위로 해소한다.
- 선택 후보 적용과 투표 마감, 양보 원장 갱신, 새 일정 버전 생성은 하나의 DB 트랜잭션으로 처리한다.
- 적용 직전에 현재 일정 버전을 다시 확인하고 stale이면 새 버전과 양보 원장을 만들지 않는다. 마감 재시도는 이미 완료된 결과를 반환한다.
- 그룹 응답은 득표수와 투표 완료 인원만 반환하고 사용자별 선택은 반환하지 않는다.
- 인증된 본인에게만 `myVoteProposalId`를 반환해 선택 변경·철회를 지원하며, 다른 멤버의 식별자와 선택은 어떤 그룹 응답에도 포함하지 않는다.
- 마감 응답은 `winnerProposalId`, `closingReason`, `closedAt`, `appliedItineraryVersionId`, `appliedAt`을 추가로 반환한다.

## 6. 삭제·감사·보안

- 계정 삭제는 `app_user`의 표시 이름과 Cognito subject 원문을 익명값으로 교체하고 `DELETED` 상태·삭제 시각을 기록한다.
- 삭제된 access token이 내부 계정을 다시 만들지 못하도록 Cognito subject의 SHA-256 tombstone만 별도 보존한다. 원문 subject는 유지하지 않는다.
- 삭제 사용자의 활성 멤버십은 종료하고, 해당 사용자가 방장인 `DRAFT`·`ACTIVE` 여행은 `ARCHIVED`로 전환하며 관련 활성 멤버십과 초대를 종료한다.
- 실제 Cognito User Pool 사용자 삭제는 AWS 인프라 연결 후 API의 내부 삭제와 조정한다. 현재 웹은 내부 삭제 성공 시 refresh token 폐기를 시도하고 로컬 세션 쿠키를 제거한다.
- 여행 종료 30일 후 `PrivatePreference`, 멤버별 후보 만족도, `Vote` 선택값을 삭제한다.
- 투표 총계와 일정 버전은 익명 집계로 유지한다.
- 일정 변경 감사 기록에는 행위 유형·시각·버전만 남기고 민감 입력은 남기지 않는다.
- DB 쿼리와 직렬화 테스트에서 다른 사용자의 민감 행을 반환할 수 없는지 검증한다.
