import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  createDisruption,
  dismissDisruption,
  listDisruptions,
  startDisruptionReplan,
} from "../src/index.ts";

const disruption = {
  description: "임시 휴관 안내를 확인했어요.",
  id: "disruption-1",
  itinerarySlotId: "slot-1",
  itineraryVersionId: "version-1",
  itineraryVersionNumber: 1,
  placeName: "한밭수목원",
  reportedAt: "2026-08-19T09:00:00Z",
  reportedByUserId: "user-1",
  reporterDisplayName: "다정 멤버",
  slotEndsAt: "2026-09-01T02:30:00Z",
  slotStartsAt: "2026-09-01T01:00:00Z",
  status: "DETECTED",
  tripId: "trip-45",
  type: "CLOSURE",
  updatedAt: "2026-08-19T09:00:00Z",
};

test("여행별 문제 목록 경로를 인코딩해 조회한다", async () => {
  let captured;
  await listDisruptions({
    baseUrl: "https://web.example.com",
    fetch: async (url, init) => {
      captured = { init, url: String(url) };
      return Response.json({ disruptions: [disruption], tripId: "trip / 45" });
    },
    tripId: "trip / 45",
  });

  assert.equal(
    captured.url,
    "https://web.example.com/api/v1/trips/trip%20%2F%2045/disruptions",
  );
  assert.equal(captured.init.method, "GET");
});

test("문제 신고에 인증·멱등 키·원본 JSON을 전달한다", async () => {
  let captured;
  const request = {
    description: disruption.description,
    itinerarySlotId: disruption.itinerarySlotId,
    type: disruption.type,
  };
  await createDisruption({
    accessToken: "private-token",
    baseUrl: "https://api.example.com",
    fetch: async (url, init) => {
      captured = { init, url: String(url) };
      return Response.json(disruption, { status: 201 });
    },
    idempotencyKey: "report-45",
    request,
    tripId: "trip-45",
  });

  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.get("Authorization"), "Bearer private-token");
  assert.equal(captured.init.headers.get("Idempotency-Key"), "report-45");
  assert.deepEqual(JSON.parse(captured.init.body), request);
});

test("유지와 재조정 시작은 각 상태 코드와 멱등 키를 사용한다", async () => {
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ init, url: String(url) });
    return Response.json(
      { ...disruption, status: requests.length === 1 ? "DISMISSED" : "ACKNOWLEDGED" },
      { status: requests.length === 1 ? 200 : 202 },
    );
  };

  await dismissDisruption({
    baseUrl: "https://api.example.com",
    disruptionId: "disruption / 1",
    fetch,
    idempotencyKey: "keep-original",
  });
  await startDisruptionReplan({
    baseUrl: "https://api.example.com",
    disruptionId: "disruption / 2",
    fetch,
    idempotencyKey: "start-replan",
  });

  assert.equal(
    requests[0].url,
    "https://api.example.com/api/v1/disruptions/disruption%20%2F%201/dismiss",
  );
  assert.equal(
    requests[1].url,
    "https://api.example.com/api/v1/disruptions/disruption%20%2F%202/replans",
  );
  assert.equal(requests[0].init.headers.get("Idempotency-Key"), "keep-original");
  assert.equal(requests[1].init.headers.get("Idempotency-Key"), "start-replan");
});

test("문제 API 오류 상태와 본문을 보존한다", async () => {
  await assert.rejects(
    () =>
      listDisruptions({
        baseUrl: "https://api.example.com",
        fetch: async () =>
          Response.json(
            { code: "DISRUPTION_FORBIDDEN", message: "권한 없음" },
            { status: 403 },
          ),
        tripId: "trip-45",
      }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 403);
      assert.deepEqual(error.responseBody, {
        code: "DISRUPTION_FORBIDDEN",
        message: "권한 없음",
      });
      return true;
    },
  );
});
