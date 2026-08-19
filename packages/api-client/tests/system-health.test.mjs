import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiClientError,
  createApiClient,
  getSystemHealth,
} from "../src/system-health.ts";

test("health 200 응답과 요청 설정을 반환한다", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ init, url });
    return Response.json({ database: "UP", status: "UP" });
  };

  const response = await getSystemHealth({
    baseUrl: "https://api.example.com/",
    fetch,
  });

  assert.deepEqual(response, { database: "UP", status: "UP" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.example.com/api/v1/system/health");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.Accept, "application/json");
});

test("health 503은 연결 오류가 아닌 DOWN 상태로 반환한다", async () => {
  const client = createApiClient({
    baseUrl: "https://api.example.com",
    fetch: async () =>
      Response.json(
        { database: "DOWN", status: "DOWN" },
        { status: 503 },
      ),
  });

  await assert.doesNotReject(async () => {
    assert.deepEqual(await client.getSystemHealth(), {
      database: "DOWN",
      status: "DOWN",
    });
  });
});

test("문서화되지 않은 HTTP 상태는 ApiClientError로 노출한다", async () => {
  await assert.rejects(
    getSystemHealth({
      baseUrl: "https://api.example.com",
      fetch: async () => Response.json({ message: "failure" }, { status: 500 }),
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 500);
      assert.deepEqual(error.responseBody, { message: "failure" });
      return true;
    },
  );
});

test("JSON이 아닌 오류 본문도 ApiClientError에 보존한다", async () => {
  await assert.rejects(
    getSystemHealth({
      baseUrl: "https://api.example.com",
      fetch: async () => new Response("temporary failure", { status: 502 }),
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 502);
      assert.equal(error.responseBody, "temporary failure");
      return true;
    },
  );
});

test("빈 baseUrl은 요청 전에 거부한다", async () => {
  await assert.rejects(
    getSystemHealth({ baseUrl: "  ", fetch: async () => Response.json({}) }),
    /baseUrl은 비어 있을 수 없습니다/,
  );
});
