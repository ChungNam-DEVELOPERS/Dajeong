import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  getMyPrivatePreference,
  getPreferenceSubmissionStatus,
  saveMyPrivatePreference,
} from "../src/index.ts";

const preference = {
  activityLevel: 3,
  budgetPerPerson: 50000,
  preferredCategories: ["NATURE", "FOOD"],
  priorities: ["FLEXIBLE_SCHEDULE", "SAVE_BUDGET"],
  travelTolerance: 2,
};

test("본인 선호와 제출 현황을 여행별 경로로 조회한다", async () => {
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ init, url: String(url) });
    return Response.json(
      requests.length === 1
        ? {
            ...preference,
            submittedAt: "2026-08-19T08:00:00Z",
            tripId: "trip / 43",
            updatedAt: "2026-08-19T08:00:00Z",
            userId: "user-1",
          }
        : {
            members: [],
            submittedCount: 0,
            totalCount: 0,
            tripId: "trip / 43",
          },
    );
  };

  await getMyPrivatePreference({
    baseUrl: "https://web.example.com",
    fetch,
    tripId: "trip / 43",
  });
  await getPreferenceSubmissionStatus({
    baseUrl: "https://web.example.com",
    fetch,
    tripId: "trip / 43",
  });

  assert.equal(
    requests[0].url,
    "https://web.example.com/api/v1/trips/trip%20%2F%2043/preferences/me",
  );
  assert.equal(
    requests[1].url,
    "https://web.example.com/api/v1/trips/trip%20%2F%2043/preferences/status",
  );
  assert.equal(requests[0].init.method, "GET");
  assert.equal(requests[1].init.method, "GET");
});

test("본인 선호 저장 요청에 인증과 원본 JSON을 전달한다", async () => {
  let captured;
  const fetch = async (url, init) => {
    captured = { init, url: String(url) };
    return Response.json({
      ...preference,
      submittedAt: "2026-08-19T08:00:00Z",
      tripId: "trip-43",
      updatedAt: "2026-08-19T08:00:00Z",
      userId: "user-1",
    });
  };

  await saveMyPrivatePreference({
    accessToken: "private-token",
    baseUrl: "https://api.example.com",
    fetch,
    request: preference,
    tripId: "trip-43",
  });

  assert.equal(captured.init.method, "PUT");
  assert.equal(captured.init.headers.get("Authorization"), "Bearer private-token");
  assert.equal(captured.init.headers.get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(captured.init.body), preference);
});

test("웹 BFF 호출은 access token 없이 같은 선호 계약을 사용한다", async () => {
  let authorization = "not-called";
  const fetch = async (_url, init) => {
    authorization = init.headers.get("Authorization");
    return Response.json({
      members: [],
      submittedCount: 0,
      totalCount: 0,
      tripId: "trip-43",
    });
  };

  await getPreferenceSubmissionStatus({
    baseUrl: "https://web.example.com",
    fetch,
    tripId: "trip-43",
  });

  assert.equal(authorization, null);
});

test("선호 API 오류 상태와 본문을 보존한다", async () => {
  await assert.rejects(
    () =>
      getMyPrivatePreference({
        baseUrl: "https://api.example.com",
        fetch: async () =>
          Response.json(
            { code: "PREFERENCE_NOT_SUBMITTED", message: "미제출" },
            { status: 404 },
          ),
        tripId: "trip-43",
      }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.responseBody, {
        code: "PREFERENCE_NOT_SUBMITTED",
        message: "미제출",
      });
      return true;
    },
  );
});
