import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  deleteCurrentUser,
  getCurrentUser,
} from "../src/system-health.ts";

test("현재 사용자 요청에 access token을 서버 Authorization 헤더로 전달한다", async () => {
  const calls = [];
  const user = {
    createdAt: "2026-08-19T00:00:00Z",
    displayName: "다정이",
    id: "4d4f75e0-e976-4917-8ce8-44c36b53a317",
    status: "ACTIVE",
  };

  const response = await getCurrentUser({
    accessToken: "signed-access-token",
    baseUrl: "https://api.example.com/",
    fetch: async (url, init) => {
      calls.push({ init, url });
      return Response.json(user);
    },
  });

  assert.deepEqual(response, user);
  assert.equal(calls[0].url, "https://api.example.com/api/v1/me");
  assert.equal(calls[0].init.headers.get("Authorization"), "Bearer signed-access-token");
});

test("웹 BFF 호출은 access token 없이도 같은 계약을 사용할 수 있다", async () => {
  let authorization;
  await getCurrentUser({
    baseUrl: "https://web.example.com",
    fetch: async (_url, init) => {
      authorization = init.headers.get("Authorization");
      return Response.json({
        createdAt: "2026-08-19T00:00:00Z",
        displayName: "다정이",
        id: "4d4f75e0-e976-4917-8ce8-44c36b53a317",
        status: "ACTIVE",
      });
    },
  });

  assert.equal(authorization, null);
});

test("계정 삭제 요청에 인증 헤더를 전달하고 204를 성공으로 처리한다", async () => {
  let call;
  const response = await deleteCurrentUser({
    accessToken: "deletion-access-token",
    baseUrl: "https://api.example.com/",
    fetch: async (url, init) => {
      call = { init, url };
      return new Response(null, { status: 204 });
    },
  });

  assert.equal(response, undefined);
  assert.equal(call.url, "https://api.example.com/api/v1/me");
  assert.equal(call.init.method, "DELETE");
  assert.equal(
    call.init.headers.get("Authorization"),
    "Bearer deletion-access-token",
  );
});

test("계정 삭제 실패 상태와 오류 본문을 보존한다", async () => {
  await assert.rejects(
    deleteCurrentUser({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        Response.json({ code: "ACCOUNT_DELETE_FAILED" }, { status: 409 }),
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 409);
      assert.deepEqual(error.responseBody, { code: "ACCOUNT_DELETE_FAILED" });
      return true;
    },
  );
});

test("인증 실패 상태와 오류 본문을 보존한다", async () => {
  await assert.rejects(
    getCurrentUser({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        Response.json({ message: "unauthorized" }, { status: 401 }),
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 401);
      assert.deepEqual(error.responseBody, { message: "unauthorized" });
      return true;
    },
  );
});
