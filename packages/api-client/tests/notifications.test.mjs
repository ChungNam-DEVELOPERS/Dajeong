import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  listNotifications,
  readNotification,
} from "../src/index.ts";

const notification = {
  createdAt: "2026-08-20T01:00:00Z",
  id: "notification-1",
  itineraryVersionId: "version-2",
  itineraryVersionNumber: 2,
  proposalSetId: "proposal-set-1",
  readAt: null,
  tripId: "trip-55",
  tripTitle: "다정한 대전 여행",
  type: "ITINERARY_REPLAN_APPLIED",
  winnerProposalId: "proposal-1",
  winnerTitle: "실내 미술관으로 변경",
};

test("내 알림 목록에 cursor와 limit을 인코딩해 전달한다", async () => {
  let call;
  const list = { items: [notification], nextCursor: "next-cursor" };
  assert.deepEqual(
    await listNotifications({
      accessToken: "notification-token",
      baseUrl: "https://api.example.com",
      cursor: "cursor / 1",
      fetch: async (url, init) => {
        call = { init, url: String(url) };
        return Response.json(list);
      },
      limit: 15,
    }),
    list,
  );
  assert.equal(
    call.url,
    "https://api.example.com/api/v1/notifications?cursor=cursor+%2F+1&limit=15",
  );
  assert.equal(call.init.method, "GET");
  assert.equal(
    call.init.headers.get("Authorization"),
    "Bearer notification-token",
  );
});

test("알림 읽음 처리는 식별자를 인코딩하고 본문 없이 POST한다", async () => {
  let call;
  const read = { ...notification, readAt: "2026-08-20T01:05:00Z" };
  assert.deepEqual(
    await readNotification({
      baseUrl: "https://api.example.com",
      fetch: async (url, init) => {
        call = { init, url: String(url) };
        return Response.json(read);
      },
      notificationId: "notification / 1",
    }),
    read,
  );
  assert.equal(
    call.url,
    "https://api.example.com/api/v1/notifications/notification%20%2F%201/read",
  );
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.body, undefined);
});

test("다른 사용자 알림 오류 상태와 본문을 보존한다", async () => {
  await assert.rejects(
    readNotification({
      baseUrl: "https://api.example.com",
      fetch: async () =>
        Response.json(
          { code: "NOTIFICATION_NOT_FOUND", message: "알림 없음" },
          { status: 404 },
        ),
      notificationId: "notification-1",
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.responseBody, {
        code: "NOTIFICATION_NOT_FOUND",
        message: "알림 없음",
      });
      return true;
    },
  );
});
