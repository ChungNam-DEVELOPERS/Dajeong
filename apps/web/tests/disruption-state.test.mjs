import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyDisruptionDraft,
  getWeatherEvidence,
  replaceDisruption,
  toCreateDisruptionRequest,
  validateDisruptionDraft,
} from "../src/app/disruption-state.ts";

test("문제 신고 초안은 첫 일정 슬롯과 휴관 유형으로 시작한다", () => {
  assert.deepEqual(createEmptyDisruptionDraft("slot-1"), {
    description: "",
    itinerarySlotId: "slot-1",
    type: "CLOSURE",
  });
});

test("일정 선택과 1~200자 설명을 검증한다", () => {
  assert.deepEqual(
    validateDisruptionDraft({
      description: "",
      itinerarySlotId: "",
      type: "OTHER",
    }),
    {
      description: "문제 상황을 입력해 주세요.",
      itinerarySlotId: "문제가 생긴 일정 장소를 선택해 주세요.",
    },
  );
  assert.ok(
    validateDisruptionDraft({
      description: "가".repeat(201),
      itinerarySlotId: "slot-1",
      type: "TRAFFIC",
    }).description,
  );
  assert.deepEqual(
    validateDisruptionDraft({
      description: "교통이 지연되고 있어요.",
      itinerarySlotId: "slot-1",
      type: "TRAFFIC",
    }),
    {},
  );
});

test("문제 신고 요청은 설명의 양끝 공백만 제거한다", () => {
  assert.deepEqual(
    toCreateDisruptionRequest({
      description: "  현장 임시 휴관을 확인했어요.  ",
      itinerarySlotId: "slot-45",
      type: "CLOSURE",
    }),
    {
      description: "현장 임시 휴관을 확인했어요.",
      itinerarySlotId: "slot-45",
      type: "CLOSURE",
    },
  );
});

test("새 신고는 앞에 추가하고 상태 변경은 같은 항목만 교체한다", () => {
  const first = { id: "first", status: "DETECTED" };
  const second = { id: "second", status: "DETECTED" };

  assert.deepEqual(replaceDisruption([first], second), [second, first]);
  assert.deepEqual(
    replaceDisruption([second, first], { ...first, status: "DISMISSED" }),
    [second, { id: "first", status: "DISMISSED" }],
  );
});

test("날씨 방해요소에서 화면에 필요한 예보 근거만 추출한다", () => {
  const weather = {
    forecastAt: "2026-09-01T01:00:00Z",
    forecastIssuedAt: "2026-08-31T23:00:00Z",
    precipitationProbability: 60,
    type: "WEATHER",
    weatherGridX: 67,
    weatherGridY: 100,
  };

  assert.deepEqual(getWeatherEvidence(weather), {
    forecastAt: weather.forecastAt,
    forecastIssuedAt: weather.forecastIssuedAt,
    precipitationProbability: 60,
    weatherGridX: 67,
    weatherGridY: 100,
  });
  assert.equal(getWeatherEvidence({ ...weather, type: "TRAFFIC" }), null);
  assert.equal(
    getWeatherEvidence({ ...weather, precipitationProbability: null }),
    null,
  );
});
