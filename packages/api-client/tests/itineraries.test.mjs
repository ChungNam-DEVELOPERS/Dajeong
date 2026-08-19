import assert from "node:assert/strict";
import test from "node:test";

import {
  addItineraryDraftSlot,
  ApiClientError,
  deleteItineraryDraftSlot,
  getCurrentItinerary,
  getItineraryDraft,
  getItineraryTimeline,
  publishItineraryDraft,
  updateItineraryDraftSlot,
} from "../src/index.ts";

const tripId = "3d4f75e0-e976-4917-8ce8-44c36b53a317";
const slotId = "a717d524-1956-4eff-b470-fb7307da61e9";
const slotRequest = {
  address: "대전 유성구 대덕대로 481",
  category: "CULTURE",
  endsAt: "2026-09-01T02:30:00Z",
  expectedCost: 3000,
  indoor: true,
  latitude: 36.3741,
  longitude: 127.3778,
  placeName: "국립중앙과학관",
  startsAt: "2026-09-01T01:00:00Z",
};
const slot = { id: slotId, ...slotRequest };
const draft = {
  publishedRevision: null,
  revision: 1,
  slots: [slot],
  tripId,
};
const version = {
  draftRevision: 1,
  id: "6413b561-c3de-4340-a9b1-bce95a7aad59",
  previousVersionNumber: null,
  publishedAt: "2026-08-19T08:00:00Z",
  reason: "ORIGINAL",
  slots: [slot],
  tripId,
  versionNumber: 1,
};

test("일정 초안과 현재 버전을 여행별 경로로 조회한다", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ init, url });
    return Response.json(calls.length === 1 ? draft : version);
  };

  assert.deepEqual(
    await getItineraryDraft({ baseUrl: "https://api.example.com", fetch, tripId }),
    draft,
  );
  assert.deepEqual(
    await getCurrentItinerary({ baseUrl: "https://api.example.com", fetch, tripId }),
    version,
  );
  assert.equal(
    calls[0].url,
    `https://api.example.com/api/v1/trips/${tripId}/itineraries/draft`,
  );
  assert.equal(
    calls[1].url,
    `https://api.example.com/api/v1/trips/${tripId}/itineraries/current`,
  );
  assert.equal(calls[0].init.method, "GET");
});

test("일정 변경 타임라인 cursor와 limit을 보존한다", async () => {
  let call;
  const timeline = {
    items: [
      {
        currentPlaceName: "실내 미술관",
        disruptionType: "WEATHER",
        itineraryVersionId: "version-2",
        occurredAt: "2026-08-19T09:00:00Z",
        previousPlaceName: "야외 공원",
        previousVersionNumber: 1,
        proposalSetId: "proposal-set-1",
        reason: "REPLAN",
        versionNumber: 2,
        winnerProposalId: "proposal-1",
        winnerTitle: "실내 미술관으로 변경",
      },
    ],
    nextCursor: "next timeline",
    tripId,
  };
  assert.deepEqual(
    await getItineraryTimeline({
      accessToken: "timeline-token",
      baseUrl: "https://api.example.com",
      cursor: "previous timeline",
      fetch: async (url, init) => {
        call = { init, url: String(url) };
        return Response.json(timeline);
      },
      limit: 10,
      tripId,
    }),
    timeline,
  );
  assert.equal(
    call.url,
    `https://api.example.com/api/v1/trips/${tripId}/itineraries/timeline` +
      "?cursor=previous+timeline&limit=10",
  );
  assert.equal(call.init.method, "GET");
  assert.equal(call.init.headers.get("Authorization"), "Bearer timeline-token");
});

test("초안 슬롯 추가에 인증·revision·멱등 헤더와 JSON을 전달한다", async () => {
  let call;
  const response = await addItineraryDraftSlot({
    accessToken: "itinerary-token",
    baseUrl: "https://api.example.com",
    fetch: async (url, init) => {
      call = { init, url };
      return Response.json(draft, { status: 201 });
    },
    idempotencyKey: "slot-once",
    request: slotRequest,
    revision: 0,
    tripId,
  });

  assert.deepEqual(response, draft);
  assert.equal(
    call.url,
    `https://api.example.com/api/v1/trips/${tripId}/itineraries/draft/slots`,
  );
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.get("Authorization"), "Bearer itinerary-token");
  assert.equal(call.init.headers.get("If-Match"), '"0"');
  assert.equal(call.init.headers.get("Idempotency-Key"), "slot-once");
  assert.deepEqual(JSON.parse(call.init.body), slotRequest);
});

test("초안 슬롯 수정과 삭제에 slot ID와 최신 revision을 보낸다", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ init, url });
    return Response.json({ ...draft, revision: calls.length + 1 });
  };

  await updateItineraryDraftSlot({
    baseUrl: "https://api.example.com",
    fetch,
    request: slotRequest,
    revision: 1,
    slotId,
    tripId,
  });
  await deleteItineraryDraftSlot({
    baseUrl: "https://api.example.com",
    fetch,
    revision: 2,
    slotId,
    tripId,
  });

  const expectedUrl =
    `https://api.example.com/api/v1/trips/${tripId}` +
    `/itineraries/draft/slots/${slotId}`;
  assert.equal(calls[0].url, expectedUrl);
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[0].init.headers.get("If-Match"), '"1"');
  assert.deepEqual(JSON.parse(calls[0].init.body), slotRequest);
  assert.equal(calls[1].url, expectedUrl);
  assert.equal(calls[1].init.method, "DELETE");
  assert.equal(calls[1].init.headers.get("If-Match"), '"2"');
  assert.equal(calls[1].init.body, undefined);
});

test("일정 발행은 revision과 멱등 키를 보존한다", async () => {
  let call;
  const response = await publishItineraryDraft({
    baseUrl: "https://api.example.com",
    fetch: async (url, init) => {
      call = { init, url };
      return Response.json(version, { status: 201 });
    },
    idempotencyKey: "publish-once",
    revision: 1,
    tripId,
  });

  assert.deepEqual(response, version);
  assert.equal(
    call.url,
    `https://api.example.com/api/v1/trips/${tripId}/itineraries/draft/publish`,
  );
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.get("If-Match"), '"1"');
  assert.equal(call.init.headers.get("Idempotency-Key"), "publish-once");
});

test("일정 API 오류 상태와 본문을 보존한다", async () => {
  await assert.rejects(
    getCurrentItinerary({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        Response.json(
          { code: "ITINERARY_NOT_PUBLISHED", message: "아직 일정이 없습니다." },
          { status: 404 },
        ),
      tripId,
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.responseBody, {
        code: "ITINERARY_NOT_PUBLISHED",
        message: "아직 일정이 없습니다.",
      });
      return true;
    },
  );
});
