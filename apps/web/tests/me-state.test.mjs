import assert from "node:assert/strict";
import test from "node:test";

import {
  initialMeState,
  meStateReducer,
} from "../src/app/me-state.ts";

const user = {
  createdAt: "2026-08-19T00:00:00Z",
  displayName: "다정이",
  id: "4d4f75e0-e976-4917-8ce8-44c36b53a317",
  status: "ACTIVE",
};

test("내 사용자 응답을 인증 상태로 보존한다", () => {
  assert.deepEqual(
    meStateReducer(initialMeState, { type: "resolve", user }),
    { deletion: { phase: "idle" }, phase: "authenticated", user },
  );
});

test("계정 삭제는 확인·진행·실패·완료 상태를 구분한다", () => {
  const authenticated = meStateReducer(initialMeState, {
    type: "resolve",
    user,
  });
  const confirming = meStateReducer(authenticated, { type: "beginDeletion" });
  assert.deepEqual(confirming, {
    deletion: { phase: "confirming" },
    phase: "authenticated",
    user,
  });

  const deleting = meStateReducer(confirming, { type: "requestDeletion" });
  assert.deepEqual(deleting, {
    deletion: { phase: "deleting" },
    phase: "authenticated",
    user,
  });

  assert.deepEqual(
    meStateReducer(deleting, {
      message: "삭제 API 실패",
      type: "deletionFailed",
    }),
    {
      deletion: { message: "삭제 API 실패", phase: "error" },
      phase: "authenticated",
      user,
    },
  );
  assert.deepEqual(
    meStateReducer(deleting, { type: "deletionSucceeded" }),
    { phase: "deleted" },
  );
});

test("계정 삭제 확인을 취소하면 초기 상태로 돌아간다", () => {
  const authenticated = meStateReducer(initialMeState, {
    type: "resolve",
    user,
  });
  const confirming = meStateReducer(authenticated, { type: "beginDeletion" });

  assert.deepEqual(
    meStateReducer(confirming, { type: "cancelDeletion" }),
    authenticated,
  );
});

test("401과 연결 오류를 서로 다른 상태로 표현한다", () => {
  assert.deepEqual(
    meStateReducer(initialMeState, { type: "unauthenticated" }),
    { phase: "unauthenticated" },
  );
  assert.deepEqual(
    meStateReducer(initialMeState, {
      message: "API 연결 실패",
      type: "reject",
    }),
    { message: "API 연결 실패", phase: "error" },
  );
});
