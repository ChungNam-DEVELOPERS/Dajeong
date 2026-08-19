import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyPreferenceDraft,
  preferenceResponseToDraft,
  togglePreferenceSelection,
  toPrivatePreferenceRequest,
  validatePreferenceDraft,
} from "../src/app/preference-state.ts";

test("선호 입력의 기본값은 아직 제출되지 않은 안전한 초안이다", () => {
  assert.deepEqual(createEmptyPreferenceDraft(), {
    activityLevel: 3,
    budgetPerPerson: "300000",
    preferredCategories: [],
    priorities: [],
    travelTolerance: 3,
  });
});

test("예산과 필수 선택, 중복 선택을 검증한다", () => {
  const errors = validatePreferenceDraft({
    activityLevel: 0,
    budgetPerPerson: "100000001",
    preferredCategories: ["FOOD", "FOOD"],
    priorities: [],
    travelTolerance: 6,
  });

  assert.ok(errors.budgetPerPerson);
  assert.ok(errors.activityLevel);
  assert.ok(errors.travelTolerance);
  assert.ok(errors.preferredCategories);
  assert.ok(errors.priorities);
});

test("선택 토글은 최대 개수를 넘기지 않고 다시 누르면 해제한다", () => {
  assert.deepEqual(togglePreferenceSelection(["FOOD"], "CAFE", 2), [
    "FOOD",
    "CAFE",
  ]);
  assert.deepEqual(
    togglePreferenceSelection(["FOOD", "CAFE"], "NATURE", 2),
    ["FOOD", "CAFE"],
  );
  assert.deepEqual(
    togglePreferenceSelection(["FOOD", "CAFE"], "FOOD", 2),
    ["CAFE"],
  );
});

test("저장 응답은 수정 초안으로, 초안은 API 요청으로 변환한다", () => {
  const response = {
    activityLevel: 4,
    budgetPerPerson: 450000,
    preferredCategories: ["NATURE", "CAFE"],
    priorities: ["NATURE_HEALING", "MINIMIZE_TRAVEL"],
    submittedAt: "2026-08-19T08:00:00Z",
    travelTolerance: 2,
    tripId: "trip-id",
    updatedAt: "2026-08-19T08:00:00Z",
    userId: "user-id",
  };
  const draft = preferenceResponseToDraft(response);

  assert.equal(draft.budgetPerPerson, "450000");
  assert.deepEqual(toPrivatePreferenceRequest(draft), {
    activityLevel: 4,
    budgetPerPerson: 450000,
    preferredCategories: ["NATURE", "CAFE"],
    priorities: ["NATURE_HEALING", "MINIMIZE_TRAVEL"],
    travelTolerance: 2,
  });
});
