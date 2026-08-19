import type {
  CreateDisruptionRequest,
  DisruptionResponse,
  ManualDisruptionType,
  ProposalSetResponse,
  ReplanStartResponse,
} from "@dajeong/api-client";

export interface DisruptionDraft {
  description: string;
  itinerarySlotId: string;
  type: ManualDisruptionType;
}

export interface WeatherEvidence {
  forecastAt: string;
  forecastIssuedAt: string;
  precipitationProbability: number;
  weatherGridX: number;
  weatherGridY: number;
}

export type DisruptionDraftErrors = Partial<
  Record<keyof DisruptionDraft, string>
>;

export function createEmptyDisruptionDraft(
  itinerarySlotId = "",
): DisruptionDraft {
  return { description: "", itinerarySlotId, type: "CLOSURE" };
}

export function validateDisruptionDraft(
  draft: DisruptionDraft,
): DisruptionDraftErrors {
  const errors: DisruptionDraftErrors = {};
  if (!draft.itinerarySlotId) {
    errors.itinerarySlotId = "문제가 생긴 일정 장소를 선택해 주세요.";
  }
  const description = draft.description.trim();
  if (!description) {
    errors.description = "문제 상황을 입력해 주세요.";
  } else if (description.length > 200) {
    errors.description = "문제 상황은 200자 이내로 입력해 주세요.";
  }
  return errors;
}

export function toCreateDisruptionRequest(
  draft: DisruptionDraft,
): CreateDisruptionRequest {
  return {
    description: draft.description.trim(),
    itinerarySlotId: draft.itinerarySlotId,
    type: draft.type,
  };
}

export function replaceDisruption(
  disruptions: readonly DisruptionResponse[],
  updated: DisruptionResponse,
): DisruptionResponse[] {
  const exists = disruptions.some((item) => item.id === updated.id);
  if (!exists) {
    return [updated, ...disruptions];
  }
  return disruptions.map((item) => (item.id === updated.id ? updated : item));
}

export function applyReplanStart(
  disruptions: readonly DisruptionResponse[],
  started: ReplanStartResponse,
): DisruptionResponse[] {
  return disruptions.map((item) =>
    item.id === started.disruptionId
      ? {
          ...item,
          proposalSetId: started.proposalSet.id,
          status: started.disruptionStatus,
        }
      : item,
  );
}

export function applyOptimisticProposalVote(
  proposalSet: ProposalSetResponse,
  proposalId: string | null,
): ProposalSetResponse {
  const previousProposalId = proposalSet.myVoteProposalId ?? null;
  if (previousProposalId === proposalId) {
    return proposalSet;
  }
  const participationDelta =
    previousProposalId === null ? 1 : proposalId === null ? -1 : 0;
  return {
    ...proposalSet,
    myVoteProposalId: proposalId,
    participantCount: Math.max(
      0,
      Math.min(
        proposalSet.eligibleMemberCount,
        proposalSet.participantCount + participationDelta,
      ),
    ),
    proposals: proposalSet.proposals.map((proposal) => {
      const voteDelta =
        (proposal.id === proposalId ? 1 : 0) -
        (proposal.id === previousProposalId ? 1 : 0);
      return {
        ...proposal,
        voteCount: Math.max(0, proposal.voteCount + voteDelta),
      };
    }),
  };
}

export function proposalFailureMessage(code?: string | null): string {
  switch (code) {
    case "NO_VOTES":
      return "마감까지 참여한 표가 없어 원본 일정을 유지했습니다.";
    case "NO_FEASIBLE_PROPOSAL":
      return "검증 가능한 후보를 찾지 못했습니다. 원본 일정을 유지하거나 직접 편집해 주세요.";
    case "PREFERENCES_INCOMPLETE":
      return "모든 멤버의 선호가 제출된 뒤 후보를 만들 수 있습니다.";
    case "STALE_ITINERARY":
      return "일정 버전이 바뀌어 이 후보 작업을 취소했습니다. 최신 문제 현황에서 다시 시작해 주세요.";
    case "INVALID_SOURCE_SLOT":
      return "영향 일정의 위치 정보가 없어 후보를 검증할 수 없습니다.";
    case "UPSTREAM_UNAVAILABLE":
      return "후보 정보 제공처에 연결하지 못했습니다. 원본 일정은 변경되지 않았습니다.";
    default:
      return "후보 생성을 완료하지 못했습니다. 원본 일정은 변경되지 않았습니다.";
  }
}

export function proposalResolutionMessage(
  proposalSet: ProposalSetResponse,
): string | null {
  if (proposalSet.status === "APPLIED") {
    const winner = proposalSet.proposals.find(
      (proposal) => proposal.id === proposalSet.winnerProposalId,
    );
    const closing =
      proposalSet.closingReason === "ALL_MEMBERS_VOTED"
        ? "전원 참여로"
        : "12시간 마감 결과로";
    return winner
      ? `${closing} ${winner.title} 후보가 확정되어 새 일정에 반영됐습니다.`
      : `${closing} 선택된 후보가 새 일정에 반영됐습니다.`;
  }
  if (proposalSet.status === "CANCELLED" && proposalSet.closedAt) {
    return proposalFailureMessage(proposalSet.failureCode);
  }
  return null;
}

export function isVoteResolved(proposalSet: ProposalSetResponse): boolean {
  return (
    proposalSet.status === "APPLIED" ||
    (proposalSet.status === "CANCELLED" && Boolean(proposalSet.closedAt))
  );
}

export function getWeatherEvidence(
  disruption: DisruptionResponse,
): WeatherEvidence | null {
  const {
    forecastAt,
    forecastIssuedAt,
    precipitationProbability,
    weatherGridX,
    weatherGridY,
  } = disruption;
  if (
    disruption.type !== "WEATHER" ||
    forecastAt === null ||
    forecastAt === undefined ||
    forecastIssuedAt === null ||
    forecastIssuedAt === undefined ||
    precipitationProbability === null ||
    precipitationProbability === undefined ||
    weatherGridX === null ||
    weatherGridX === undefined ||
    weatherGridY === null ||
    weatherGridY === undefined
  ) {
    return null;
  }
  return {
    forecastAt,
    forecastIssuedAt,
    precipitationProbability,
    weatherGridX,
    weatherGridY,
  };
}
