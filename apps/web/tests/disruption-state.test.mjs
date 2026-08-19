import assert from "node:assert/strict";
import test from "node:test";

import {
  applyOptimisticProposalVote,
  applyReplanStart,
  createEmptyDisruptionDraft,
  getWeatherEvidence,
  proposalFailureMessage,
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

test("재조정 시작 응답은 해당 문제와 후보 세트만 연결한다", () => {
  const first = { id: "first", status: "DETECTED" };
  const second = { id: "second", status: "DETECTED" };
  const started = {
    disruptionId: "second",
    disruptionStatus: "ACKNOWLEDGED",
    proposalSet: { id: "proposal-set-1" },
  };

  assert.deepEqual(applyReplanStart([first, second], started), [
    first,
    {
      id: "second",
      proposalSetId: "proposal-set-1",
      status: "ACKNOWLEDGED",
    },
  ]);
});

test("후보 실패 코드를 사용자가 복구할 수 있는 문구로 구분한다", () => {
  assert.match(proposalFailureMessage("PREFERENCES_INCOMPLETE"), /모든 멤버/);
  assert.match(proposalFailureMessage("STALE_ITINERARY"), /일정 버전/);
  assert.match(proposalFailureMessage("UPSTREAM_UNAVAILABLE"), /연결하지 못/);
  assert.match(proposalFailureMessage("UNKNOWN"), /완료하지 못/);
});

test("내 투표의 낙관적 생성·변경·철회는 집계를 중복하지 않는다", () => {
  const proposalSet = {
    eligibleMemberCount: 3,
    myVoteProposalId: null,
    participantCount: 0,
    proposals: [
      { id: "proposal-1", voteCount: 0 },
      { id: "proposal-2", voteCount: 0 },
    ],
  };

  const created = applyOptimisticProposalVote(proposalSet, "proposal-1");
  assert.equal(created.participantCount, 1);
  assert.deepEqual(created.proposals.map(({ voteCount }) => voteCount), [1, 0]);
  assert.equal(
    applyOptimisticProposalVote(created, "proposal-1"),
    created,
  );

  const changed = applyOptimisticProposalVote(created, "proposal-2");
  assert.equal(changed.participantCount, 1);
  assert.deepEqual(changed.proposals.map(({ voteCount }) => voteCount), [0, 1]);

  const withdrawn = applyOptimisticProposalVote(changed, null);
  assert.equal(withdrawn.participantCount, 0);
  assert.deepEqual(withdrawn.proposals.map(({ voteCount }) => voteCount), [0, 0]);
});
