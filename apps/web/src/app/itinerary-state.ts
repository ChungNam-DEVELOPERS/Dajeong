import type {
  ItineraryDraftResponse,
  ItinerarySlotRequest,
  ItineraryTimelineItem,
  ItineraryTimelineResponse,
  ItineraryVersionResponse,
  TripSummaryResponse,
} from "@dajeong/api-client";

export type ItineraryWorkspaceState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | { phase: "forbidden"; message: string }
  | { phase: "error"; message: string }
  | {
      current: ItineraryVersionResponse | null;
      draft: ItineraryDraftResponse | null;
      phase: "ready";
      trip: TripSummaryResponse;
    };

export type ItineraryWorkspaceAction =
  | { type: "request" }
  | { type: "unauthenticated" }
  | { message: string; type: "forbidden" | "reject" }
  | {
      current: ItineraryVersionResponse | null;
      draft: ItineraryDraftResponse | null;
      trip: TripSummaryResponse;
      type: "resolve";
    }
  | { draft: ItineraryDraftResponse; type: "draft-updated" }
  | { version: ItineraryVersionResponse; type: "published" };

export const initialItineraryState: ItineraryWorkspaceState = {
  phase: "loading",
};

export function itineraryStateReducer(
  state: ItineraryWorkspaceState,
  action: ItineraryWorkspaceAction,
): ItineraryWorkspaceState {
  switch (action.type) {
    case "request":
      return { phase: "loading" };
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "forbidden":
      return { message: action.message, phase: "forbidden" };
    case "reject":
      return { message: action.message, phase: "error" };
    case "resolve":
      return {
        current: action.current,
        draft: action.draft,
        phase: "ready",
        trip: action.trip,
      };
    case "draft-updated":
      return state.phase === "ready"
        ? { ...state, draft: action.draft }
        : state;
    case "published":
      return state.phase === "ready"
        ? {
            ...state,
            current: action.version,
            draft: state.draft
              ? {
                  ...state.draft,
                  publishedRevision: state.draft.revision,
                }
              : null,
          }
        : state;
  }
}

export type ItineraryCategory = ItinerarySlotRequest["category"];

export interface ItinerarySlotDraft {
  address: string;
  category: ItineraryCategory;
  date: string;
  endTime: string;
  expectedCost: string;
  indoor: boolean;
  latitude: string;
  longitude: string;
  placeName: string;
  startTime: string;
}

export type ItinerarySlotDraftErrors = Partial<
  Record<keyof ItinerarySlotDraft, string>
>;

export function createEmptySlotDraft(startDate: string): ItinerarySlotDraft {
  return {
    address: "",
    category: "CULTURE",
    date: startDate,
    endTime: "11:00",
    expectedCost: "0",
    indoor: true,
    latitude: "",
    longitude: "",
    placeName: "",
    startTime: "10:00",
  };
}

export function validateItinerarySlotDraft(
  draft: ItinerarySlotDraft,
  trip: Pick<TripSummaryResponse, "endDate" | "startDate">,
): ItinerarySlotDraftErrors {
  const errors: ItinerarySlotDraftErrors = {};
  if (!draft.placeName.trim()) {
    errors.placeName = "장소 이름을 입력해 주세요.";
  }
  if (!draft.address.trim()) {
    errors.address = "주소를 입력해 주세요.";
  }
  if (!draft.date) {
    errors.date = "일정 날짜를 선택해 주세요.";
  } else if (draft.date < trip.startDate || draft.date > trip.endDate) {
    errors.date = "여행 기간 안의 날짜를 선택해 주세요.";
  }
  if (!draft.startTime) {
    errors.startTime = "시작 시각을 입력해 주세요.";
  }
  if (!draft.endTime) {
    errors.endTime = "종료 시각을 입력해 주세요.";
  } else if (draft.startTime && draft.endTime <= draft.startTime) {
    errors.endTime = "종료 시각은 시작 시각보다 늦어야 합니다.";
  }

  const latitude = parseOptionalNumber(draft.latitude);
  const longitude = parseOptionalNumber(draft.longitude);
  if ((latitude === null) !== (longitude === null)) {
    errors.latitude = "위도와 경도는 함께 입력해 주세요.";
    errors.longitude = "위도와 경도는 함께 입력해 주세요.";
  } else {
    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      errors.latitude = "위도는 -90에서 90 사이여야 합니다.";
    }
    if (
      longitude !== null &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    ) {
      errors.longitude = "경도는 -180에서 180 사이여야 합니다.";
    }
  }

  const expectedCost = Number(draft.expectedCost);
  if (
    !Number.isInteger(expectedCost) ||
    expectedCost < 0 ||
    expectedCost > 100_000_000
  ) {
    errors.expectedCost = "예상 비용은 0원 이상 정수로 입력해 주세요.";
  }
  return errors;
}

export function toItinerarySlotRequest(
  draft: ItinerarySlotDraft,
): ItinerarySlotRequest {
  const latitude = parseOptionalNumber(draft.latitude);
  const longitude = parseOptionalNumber(draft.longitude);
  return {
    address: draft.address.trim(),
    category: draft.category,
    endsAt: toUtcIso(draft.date, draft.endTime),
    expectedCost: Number(draft.expectedCost),
    indoor: draft.indoor,
    ...(latitude === null ? {} : { latitude }),
    ...(longitude === null ? {} : { longitude }),
    placeName: draft.placeName.trim(),
    startsAt: toUtcIso(draft.date, draft.startTime),
  };
}

export function appendItineraryTimeline(
  current: ItineraryTimelineResponse,
  next: ItineraryTimelineResponse,
): ItineraryTimelineResponse {
  const seen = new Set(current.items.map((item) => item.itineraryVersionId));
  return {
    items: [
      ...current.items,
      ...next.items.filter((item) => {
        if (seen.has(item.itineraryVersionId)) {
          return false;
        }
        seen.add(item.itineraryVersionId);
        return true;
      }),
    ],
    nextCursor: next.nextCursor,
    tripId: current.tripId,
  };
}

export function itineraryTimelineMessage(item: ItineraryTimelineItem): string {
  if (
    item.reason === "REPLAN" &&
    item.previousPlaceName &&
    item.currentPlaceName
  ) {
    return `${item.previousPlaceName}에서 ${item.currentPlaceName}(으)로 변경됐어요.`;
  }
  return item.reason === "ORIGINAL"
    ? "방장이 첫 확정 일정을 발행했어요."
    : "그룹 투표 결과가 새 일정 버전에 반영됐어요.";
}

function parseOptionalNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}
