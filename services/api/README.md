# 다정 API

Java 21과 Spring Boot 4.1 기반의 다정 백엔드 API다. 시스템 Gradle 설치 대신 저장소에 포함된 Gradle Wrapper를 사용한다.

## 현재 범위

- Spring Web MVC
- Actuator
- Bean Validation
- springdoc OpenAPI와 Swagger UI
- Flyway와 PostgreSQL 드라이버 의존성

PostgreSQL 실행과 실제 DataSource 연결은 `FND-07`에서 추가한다. 그전까지 애플리케이션이 외부 DB 없이 시작되도록 `DataSourceAutoConfiguration`을 비활성화한다.

## 실행과 검사

저장소 루트에서 실행한다.

```bash
./services/api/gradlew -p services/api test
./services/api/gradlew -p services/api bootJar
./services/api/gradlew -p services/api bootRun
```

애플리케이션이 시작되면 다음 엔드포인트를 확인할 수 있다.

- Actuator health: `http://localhost:8080/actuator/health`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

`bootRun`은 `Ctrl+C`로 정상 종료한다. 생성된 JAR와 Gradle 캐시는 Git에 포함하지 않는다.
