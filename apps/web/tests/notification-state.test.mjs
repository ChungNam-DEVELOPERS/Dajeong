import assert from "node:assert/strict";
import test from "node:test";

import {
  initialNotificationState,
  notificationHref,
  notificationMessage,
  notificationStateReducer,
} from "../src/app/notification-state.ts";

const first = {
  createdAt: "2026-08-20T01:00:00Z",
  id: "notification-1",
  itineraryVersionId: "version-2",
  itineraryVersionNumber: 2,
  proposalSetId: "proposal-set / 1",
  readAt: null,
  tripId: "trip / 55",
  tripTitle: "다정한 대전 여행",
  type: "ITINERARY_REPLAN_APPLIED",
  winnerProposalId: "proposal-1",
  winnerTitle: "실내 미술관으로 변경",
};

test("알림 목록을 준비하고 중복 없이 다음 cursor를 잇는다", () => {
  const ready = notificationStateReducer(initialNotificationState, {
    response: { items: [first], nextCursor: "next-1" },
    type: "resolve",
  });
  const second = { ...first, id: "notification-2", readAt: first.createdAt };
  const appended = notificationStateReducer(ready, {
    response: { items: [first, second], nextCursor: null },
    type: "append",
  });

  assert.equal(appended.phase, "ready");
  assert.deepEqual(
    appended.items.map((item) => item.id),
    ["notification-1", "notification-2"],
  );
  assert.equal(appended.nextCursor, null);
});

test("읽음 응답은 해당 알림만 교체한다", () => {
  const second = { ...first, id: "notification-2" };
  const ready = notificationStateReducer(initialNotificationState, {
    response: { items: [first, second], nextCursor: null },
    type: "resolve",
  });
  const read = { ...first, readAt: "2026-08-20T01:05:00Z" };
  const updated = notificationStateReducer(ready, {
    notification: read,
    type: "read",
  });

  assert.deepEqual(updated.items, [read, second]);
});

test("알림은 인코딩된 여행·후보 결과로 이동하고 공개 문구만 표시한다", () => {
  assert.equal(
    notificationHref(first),
    "/trips/trip%20%2F%2055/disruptions#proposal-set-proposal-set%20%2F%201",
  );
  assert.match(notificationMessage(first), /그룹 투표/);
  assert.match(notificationMessage(first), /일정 v2/);
  assert.doesNotMatch(notificationMessage(first), /회원|user|score/i);
});

test("인증과 연결 오류 상태를 구분한다", () => {
  assert.deepEqual(
    notificationStateReducer(initialNotificationState, {
      type: "unauthenticated",
    }),
    { phase: "unauthenticated" },
  );
  assert.deepEqual(
    notificationStateReducer(initialNotificationState, {
      message: "연결 실패",
      type: "reject",
    }),
    { message: "연결 실패", phase: "error" },
  );
});
