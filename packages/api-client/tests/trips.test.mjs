import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  createTrip,
  listTrips,
} from "../src/index.ts";

const trip = {
  createdAt: "2026-08-19T00:00:00Z",
  endDate: "2026-08-23",
  id: "3d4f75e0-e976-4917-8ce8-44c36b53a317",
  region: "DAEJEON",
  role: "HOST",
  startDate: "2026-08-21",
  status: "DRAFT",
  title: "대전 여름 여행",
};

test("여행 생성 요청에 인증·멱등 헤더와 JSON 본문을 전달한다", async () => {
  const calls = [];
  const response = await createTrip({
    accessToken: "signed-access-token",
    baseUrl: "https://api.example.com/",
    fetch: async (url, init) => {
      calls.push({ init, url });
      return Response.json(trip, { status: 201 });
    },
    idempotencyKey: "trip-create-once",
    request: {
      endDate: "2026-08-23",
      startDate: "2026-08-21",
      title: "대전 여름 여행",
    },
  });

  assert.deepEqual(response, trip);
  assert.equal(calls[0].url, "https://api.example.com/api/v1/trips");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(
    calls[0].init.headers.get("Authorization"),
    "Bearer signed-access-token",
  );
  assert.equal(
    calls[0].init.headers.get("Idempotency-Key"),
    "trip-create-once",
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    endDate: "2026-08-23",
    startDate: "2026-08-21",
    title: "대전 여름 여행",
  });
});

test("웹 BFF용 여행 목록 요청에 cursor와 limit을 보존한다", async () => {
  let requestedUrl;
  const response = await listTrips({
    baseUrl: "https://web.example.com",
    cursor: "next-page",
    fetch: async (url) => {
      requestedUrl = url.toString();
      return Response.json({ items: [trip], nextCursor: "last-page" });
    },
    limit: 10,
  });

  assert.equal(
    requestedUrl,
    "https://web.example.com/api/v1/trips?cursor=next-page&limit=10",
  );
  assert.deepEqual(response, { items: [trip], nextCursor: "last-page" });
});

test("여행 API 오류 상태와 본문을 보존한다", async () => {
  await assert.rejects(
    createTrip({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        Response.json({ detail: "idempotency conflict" }, { status: 409 }),
      idempotencyKey: "reused-key",
      request: {
        endDate: "2026-08-23",
        startDate: "2026-08-21",
        title: "다른 여행",
      },
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 409);
      assert.deepEqual(error.responseBody, {
        detail: "idempotency conflict",
      });
      return true;
    },
  );
});
