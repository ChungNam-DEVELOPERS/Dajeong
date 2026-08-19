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
    { phase: "authenticated", user },
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
