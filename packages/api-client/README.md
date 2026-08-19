# `@dajeong/api-client`

Spring의 `/v3/api-docs`를 단일 계약 원천으로 사용하는 웹·앱 공용 TypeScript 클라이언트입니다. `openapi.json`과 `src/generated/schema.d.ts`는 직접 수정하지 않습니다.

## 생성과 검증

저장소 루트에서 실행합니다.

```bash
pnpm generate:api-client
pnpm check:api-client
```

`generate:api-client`는 Spring 애플리케이션 컨텍스트에서 OpenAPI 문서를 만든 뒤 환경별 서버 URL을 제거하고 키를 정렬하여 타입을 생성합니다. `check:api-client`는 현재 API 계약으로 같은 결과를 메모리에서 생성해 커밋된 파일과 비교하므로, API만 변경하고 클라이언트를 재생성하지 않으면 실패합니다.

애플리케이션과 생성 결과는 저장소 기준인 TypeScript 6.0.3으로 검사합니다. 생성기 하위 workspace만 `openapi-typescript` 7.13의 공식 peer 범위에 맞춰 TypeScript 5.9.3을 사용하므로, 애플리케이션 툴체인을 낮추거나 지원되지 않는 peer 경고를 숨기지 않습니다.

## 사용 예시

```ts
import { createApiClient } from "@dajeong/api-client";

const api = createApiClient({ baseUrl: "http://127.0.0.1:8080" });
const health = await api.getSystemHealth();
```

`200`과 문서화된 `503`은 각각 `UP`, `DOWN` 본문으로 반환합니다. 그 밖의 HTTP 상태는 `ApiClientError`, 네트워크 실패는 원래 `fetch` 오류로 전달됩니다.
