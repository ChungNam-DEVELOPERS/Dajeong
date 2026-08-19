# 다정 API

Java 21과 Spring Boot 4.1 기반의 다정 백엔드 API다. 시스템 Gradle 설치 대신 저장소에 포함된 Gradle Wrapper를 사용한다.

## 현재 범위

- Spring Web MVC
- Actuator
- Bean Validation
- springdoc OpenAPI와 Swagger UI
- Flyway와 PostgreSQL 드라이버 의존성
- Docker Compose PostgreSQL 16과 `local` DataSource 프로필
- Actuator liveness·readiness와 시스템 Health API
- Testcontainers PostgreSQL 통합 테스트

DB가 필요 없는 기본 실행에서는 DataSource 자동 구성을 비활성화한다. `local` 프로필은 이 제외를 해제하고 Docker Compose PostgreSQL에 연결한다. Flyway는 시작할 때 `db/migration`의 버전 마이그레이션을 적용한다.

## 로컬 PostgreSQL

저장소 루트의 [`.env.example`](../../.env.example)은 로컬 개발 전용 기본값이다. 값을 바꾸려면 `.env`로 복사한다. `.env`는 Git에서 제외되며 Docker Compose와 Spring `local` 프로필이 함께 읽는다.

```bash
cp .env.example .env
pnpm check:db
pnpm db:start
pnpm db:status
```

`pnpm db:stop`은 컨테이너만 중지하고 `dajeong_postgres-data` named volume은 보존한다. `docker compose down`으로 컨테이너를 다시 만들어도 데이터는 유지된다. `docker compose down --volumes`는 로컬 DB 데이터를 삭제하므로 초기화할 때만 사용한다.

## 데이터베이스 마이그레이션

첫 마이그레이션 `V1__initialize_system_health.sql`은 `system_health` 표식을 만들며 시스템 Health API가 DB 연결과 스키마 준비 상태를 함께 확인할 때 사용한다. 적용된 버전 마이그레이션은 수정하지 않고, 스키마 변경은 다음 버전 파일을 추가해 앞으로만 진행한다.

통합 테스트는 Testcontainers가 매번 만든 빈 PostgreSQL 16.15 DB에 Flyway 마이그레이션을 적용한다. 따라서 `pnpm check:api`를 실행할 때는 Docker가 실행 중이어야 한다.

## 실행과 검사

PostgreSQL이 healthy 상태가 된 뒤 저장소 루트에서 API를 실행한다.

```bash
pnpm api:local

# 개별 Gradle 작업
./services/api/gradlew -p services/api test
./services/api/gradlew -p services/api bootJar
./services/api/gradlew -p services/api bootRun --args=--spring.profiles.active=local

# OpenAPI 계약과 공용 TypeScript 클라이언트 생성·검증
pnpm generate:api-client
pnpm check:api-client
```

애플리케이션이 시작되면 다음 엔드포인트를 확인할 수 있다.

- Actuator liveness: `http://localhost:8080/actuator/health/liveness`
- Actuator readiness: `http://localhost:8080/actuator/health/readiness`
- 시스템·DB 상태: `http://localhost:8080/api/v1/system/health`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

OpenAPI 계약은 [`packages/api-client`](../../packages/api-client)에서 웹·앱 공용 타입과 health 함수로 생성한다. API 경로나 요청·응답을 변경한 커밋에는 재생성된 `openapi.json`과 `src/generated/schema.d.ts`를 함께 포함해야 한다.

`local` 프로필의 readiness에는 DB 상태가 포함되지만 liveness에는 포함되지 않는다. DB가 중단되면 readiness와 시스템 Health API는 HTTP 503 `DOWN`을 반환하고 liveness는 HTTP 200 `UP`을 유지한다. 시스템 Health API의 응답은 다음 두 형태로 고정한다.

```json
{"status":"UP","database":"UP"}
```

```json
{"status":"DOWN","database":"DOWN"}
```

`bootRun`은 `Ctrl+C`로 정상 종료한다. 생성된 JAR, Gradle 캐시, `.env`와 PostgreSQL 데이터는 Git에 포함하지 않는다.

## Staging과 Production 설정

`staging`과 `production` 프로필에는 DB 기본값이 없다. 다음 변수를 runtime에 모두 주입해야 하며, 누락되면 Spring 시작 단계에서 실패한다.

- `DAJEONG_DB_HOST`
- `DAJEONG_DB_PORT`
- `DAJEONG_DB_NAME`
- `DAJEONG_DB_USER`
- `DAJEONG_DB_PASSWORD`

비민감 값은 SSM Parameter Store, 비밀번호는 Secrets Manager에 환경별로 분리한다. 전체 공개 범위와 보관 계약은 [`docs/10-environment-configuration.md`](../../docs/10-environment-configuration.md)를 따른다.
