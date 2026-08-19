import assert from "node:assert/strict";
import test from "node:test";

import {
  initialTripState,
  tripStateReducer,
  validateTripDraft,
} from "../src/app/trip-state.ts";

const firstTrip = {
  createdAt: "2026-08-19T03:00:00Z",
  endDate: "2026-08-23",
  id: "b0eb1b7e-74db-4311-a62c-0111d3f073f5",
  region: "DAEJEON",
  role: "HOST",
  startDate: "2026-08-21",
  status: "DRAFT",
  title: "대전 여름 여행",
};

const secondTrip = {
  ...firstTrip,
  createdAt: "2026-08-18T03:00:00Z",
  id: "d843a63f-91fd-4af5-848f-5b804ad8ea7c",
  title: "대전 빵 여행",
};

test("여행 목록과 다음 cursor를 준비 상태로 보존한다", () => {
  assert.deepEqual(
    tripStateReducer(initialTripState, {
      items: [secondTrip],
      nextCursor: "next-page",
      type: "resolve",
    }),
    {
      items: [secondTrip],
      nextCursor: "next-page",
      phase: "ready",
    },
  );
});

test("새 여행은 중복 없이 목록 맨 앞에 추가한다", () => {
  const ready = tripStateReducer(initialTripState, {
    items: [secondTrip, firstTrip],
    type: "resolve",
  });

  assert.deepEqual(
    tripStateReducer(ready, { trip: firstTrip, type: "created" }),
    { items: [firstTrip, secondTrip], phase: "ready" },
  );
});

test("제목과 날짜 범위를 검증한다", () => {
  assert.deepEqual(
    validateTripDraft({
      endDate: "2026-08-20",
      startDate: "2026-08-21",
      title: "   ",
    }),
    {
      endDate: "도착일은 출발일과 같거나 이후여야 합니다.",
      title: "여행 이름을 입력해 주세요.",
    },
  );

  assert.deepEqual(
    validateTripDraft({
      endDate: "2026-08-23",
      startDate: "2026-08-21",
      title: "대전 여름 여행",
    }),
    {},
  );
});
