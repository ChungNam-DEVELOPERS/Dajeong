import assert from "node:assert/strict";
import test from "node:test";

import {
  initialInviteJoinState,
  inviteJoinStateReducer,
} from "../src/app/invite-state.ts";

const trip = {
  createdAt: "2026-08-19T00:00:00Z",
  endDate: "2026-08-23",
  id: "3d4f75e0-e976-4917-8ce8-44c36b53a317",
  region: "DAEJEON",
  role: "MEMBER",
  startDate: "2026-08-21",
  status: "DRAFT",
  title: "초대로 참여한 여행",
};

test("초대 가입 성공 시 참여한 여행을 보존한다", () => {
  assert.deepEqual(
    inviteJoinStateReducer(initialInviteJoinState, {
      trip,
      type: "resolve",
    }),
    { phase: "joined", trip },
  );
});

test("인증·만료·정원 상태를 서로 구분한다", () => {
  assert.deepEqual(
    inviteJoinStateReducer(initialInviteJoinState, {
      type: "unauthenticated",
    }),
    { phase: "unauthenticated" },
  );
  assert.deepEqual(
    inviteJoinStateReducer(initialInviteJoinState, { type: "gone" }),
    { phase: "gone" },
  );
  assert.deepEqual(
    inviteJoinStateReducer(initialInviteJoinState, { type: "full" }),
    { phase: "full" },
  );
});

test("재시도는 가입 확인 상태로 돌아간다", () => {
  assert.deepEqual(
    inviteJoinStateReducer(
      { message: "일시 오류", phase: "error" },
      { type: "request" },
    ),
    initialInviteJoinState,
  );
});
