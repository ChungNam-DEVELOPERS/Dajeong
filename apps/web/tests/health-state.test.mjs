import assert from "node:assert/strict";
import test from "node:test";
import {
  healthStateReducer,
  initialHealthState,
} from "../src/app/health-state.ts";

test("UP 응답은 API와 데이터베이스 상태를 보존한다", () => {
  const state = healthStateReducer(initialHealthState, {
    response: { database: "UP", status: "UP" },
    type: "resolve",
  });

  assert.deepEqual(state, {
    phase: "up",
    response: { database: "UP", status: "UP" },
  });
});

test("503의 DOWN 응답은 연결 오류와 구분한다", () => {
  const state = healthStateReducer(initialHealthState, {
    response: { database: "DOWN", status: "DOWN" },
    type: "resolve",
  });

  assert.deepEqual(state, {
    phase: "down",
    response: { database: "DOWN", status: "DOWN" },
  });
});

test("연결 실패 후 재시도하여 UP 상태로 복구한다", () => {
  const failed = healthStateReducer(initialHealthState, {
    message: "API 연결 실패",
    type: "reject",
  });
  const retrying = healthStateReducer(failed, { type: "request" });
  const recovered = healthStateReducer(retrying, {
    response: { database: "UP", status: "UP" },
    type: "resolve",
  });

  assert.deepEqual(failed, {
    message: "API 연결 실패",
    phase: "error",
  });
  assert.deepEqual(retrying, { phase: "loading" });
  assert.equal(recovered.phase, "up");
});
