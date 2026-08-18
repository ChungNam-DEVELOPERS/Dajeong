# 다정 API

Java 21과 Spring Boot 4.1 기반의 다정 백엔드 API다. 시스템 Gradle 설치 대신 저장소에 포함된 Gradle Wrapper를 사용한다.

## 현재 범위

- Spring Web MVC
- Actuator
- Bean Validation
- springdoc OpenAPI와 Swagger UI
- Flyway와 PostgreSQL 드라이버 의존성
- Docker Compose PostgreSQL 16과 `local` DataSource 프로필

DB가 필요 없는 기본 테스트에서는 DataSource 자동 구성을 비활성화한다. `local` 프로필은 이 제외를 해제하고 Docker Compose PostgreSQL에 연결한다. 최초 migration과 Testcontainers 검증은 `FND-08`에서 추가한다.

## 로컬 PostgreSQL

저장소 루트의 [`.env.example`](../../.env.example)은 로컬 개발 전용 기본값이다. 값을 바꾸려면 `.env`로 복사한다. `.env`는 Git에서 제외되며 Docker Compose와 Spring `local` 프로필이 함께 읽는다.

```bash
cp .env.example .env
pnpm check:db
pnpm db:start
pnpm db:status
```

`pnpm db:stop`은 컨테이너만 중지하고 `dajeong_postgres-data` named volume은 보존한다. `docker compose down`으로 컨테이너를 다시 만들어도 데이터는 유지된다. `docker compose down --volumes`는 로컬 DB 데이터를 삭제하므로 초기화할 때만 사용한다.

## 실행과 검사

PostgreSQL이 healthy 상태가 된 뒤 저장소 루트에서 API를 실행한다.

```bash
pnpm api:local

# 개별 Gradle 작업
./services/api/gradlew -p services/api test
./services/api/gradlew -p services/api bootJar
./services/api/gradlew -p services/api bootRun --args=--spring.profiles.active=local
```

애플리케이션이 시작되면 다음 엔드포인트를 확인할 수 있다.

- Actuator health: `http://localhost:8080/actuator/health`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

`bootRun`은 `Ctrl+C`로 정상 종료한다. 생성된 JAR, Gradle 캐시, `.env`와 PostgreSQL 데이터는 Git에 포함하지 않는다.
