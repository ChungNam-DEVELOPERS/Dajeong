import assert from "node:assert/strict";
import test from "node:test";

import {
  appendItineraryTimeline,
  createEmptySlotDraft,
  initialItineraryState,
  itineraryStateReducer,
  itineraryTimelineMessage,
  toItinerarySlotRequest,
  validateItinerarySlotDraft,
} from "../src/app/itinerary-state.ts";

const trip = {
  createdAt: "2026-08-19T00:00:00Z",
  endDate: "2026-09-03",
  id: "3d4f75e0-e976-4917-8ce8-44c36b53a317",
  region: "DAEJEON",
  role: "HOST",
  startDate: "2026-09-01",
  status: "DRAFT",
  title: "대전 일정 여행",
};
const draft = {
  publishedRevision: null,
  revision: 0,
  slots: [],
  tripId: trip.id,
};
const version = {
  draftRevision: 1,
  id: "6413b561-c3de-4340-a9b1-bce95a7aad59",
  previousVersionNumber: null,
  publishedAt: "2026-08-19T08:00:00Z",
  reason: "ORIGINAL",
  slots: [],
  tripId: trip.id,
  versionNumber: 1,
};

test("여행·초안·현재 버전을 준비 상태로 보존한다", () => {
  const ready = itineraryStateReducer(initialItineraryState, {
    current: null,
    draft,
    trip,
    type: "resolve",
  });

  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.trip, trip);
  assert.deepEqual(ready.draft, draft);
  assert.equal(ready.current, null);
});

test("초안 변경과 발행 결과를 현재 화면에 반영한다", () => {
  const ready = itineraryStateReducer(initialItineraryState, {
    current: null,
    draft,
    trip,
    type: "resolve",
  });
  const updatedDraft = { ...draft, revision: 1 };
  const updated = itineraryStateReducer(ready, {
    draft: updatedDraft,
    type: "draft-updated",
  });
  const published = itineraryStateReducer(updated, {
    type: "published",
    version,
  });

  assert.equal(published.phase, "ready");
  assert.equal(published.draft.revision, 1);
  assert.equal(published.draft.publishedRevision, 1);
  assert.deepEqual(published.current, version);
});

test("일정 입력의 여행 기간·시각·좌표·비용을 검증한다", () => {
  const invalid = {
    ...createEmptySlotDraft("2026-08-31"),
    endTime: "09:00",
    expectedCost: "-1",
    latitude: "36.3",
    placeName: "",
    startTime: "10:00",
  };
  const errors = validateItinerarySlotDraft(invalid, trip);

  assert.equal(errors.placeName, "장소 이름을 입력해 주세요.");
  assert.equal(errors.address, "주소를 입력해 주세요.");
  assert.equal(errors.date, "여행 기간 안의 날짜를 선택해 주세요.");
  assert.equal(errors.endTime, "종료 시각은 시작 시각보다 늦어야 합니다.");
  assert.equal(errors.longitude, "위도와 경도는 함께 입력해 주세요.");
  assert.equal(errors.expectedCost, "예상 비용은 0원 이상 정수로 입력해 주세요.");
});

test("서울 현지 입력을 UTC API 요청으로 변환한다", () => {
  const request = toItinerarySlotRequest({
    ...createEmptySlotDraft("2026-09-01"),
    address: " 대전 유성구 대덕대로 481 ",
    expectedCost: "3000",
    latitude: "36.3741",
    longitude: "127.3778",
    placeName: " 국립중앙과학관 ",
  });

  assert.deepEqual(request, {
    address: "대전 유성구 대덕대로 481",
    category: "CULTURE",
    endsAt: "2026-09-01T02:00:00.000Z",
    expectedCost: 3000,
    indoor: true,
    latitude: 36.3741,
    longitude: 127.3778,
    placeName: "국립중앙과학관",
    startsAt: "2026-09-01T01:00:00.000Z",
  });
});

test("일정 변경 타임라인을 중복 없이 이어 붙인다", () => {
  const replan = {
    currentPlaceName: "실내 미술관",
    itineraryVersionId: "version-2",
    occurredAt: "2026-08-20T01:00:00Z",
    previousPlaceName: "야외 공원",
    previousVersionNumber: 1,
    proposalSetId: "proposal-set-1",
    reason: "REPLAN",
    versionNumber: 2,
  };
  const original = {
    itineraryVersionId: "version-1",
    occurredAt: "2026-08-19T01:00:00Z",
    reason: "ORIGINAL",
    versionNumber: 1,
  };
  const appended = appendItineraryTimeline(
    { items: [replan], nextCursor: "next", tripId: trip.id },
    { items: [replan, original], nextCursor: null, tripId: trip.id },
  );

  assert.deepEqual(appended.items, [replan, original]);
  assert.equal(appended.nextCursor, null);
  assert.match(itineraryTimelineMessage(replan), /야외 공원/);
  assert.match(itineraryTimelineMessage(replan), /실내 미술관/);
  assert.match(itineraryTimelineMessage(original), /첫 확정 일정/);
});

test("인증·권한·연결 오류 상태를 구분한다", () => {
  assert.deepEqual(
    itineraryStateReducer(initialItineraryState, { type: "unauthenticated" }),
    { phase: "unauthenticated" },
  );
  assert.deepEqual(
    itineraryStateReducer(initialItineraryState, {
      message: "권한 없음",
      type: "forbidden",
    }),
    { message: "권한 없음", phase: "forbidden" },
  );
  assert.deepEqual(
    itineraryStateReducer(initialItineraryState, {
      message: "연결 실패",
      type: "reject",
    }),
    { message: "연결 실패", phase: "error" },
  );
});
