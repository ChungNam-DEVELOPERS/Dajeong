import type {
  CreateDisruptionRequest,
  DisruptionResponse,
  DisruptionType,
} from "@dajeong/api-client";

export interface DisruptionDraft {
  description: string;
  itinerarySlotId: string;
  type: DisruptionType;
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
