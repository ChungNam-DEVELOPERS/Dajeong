import type { TripSummaryResponse } from "@dajeong/api-client";

export interface TripDraft {
  endDate: string;
  startDate: string;
  title: string;
}

export type TripDraftErrors = Partial<Record<keyof TripDraft, string>>;

export type TripViewState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | {
      items: TripSummaryResponse[];
      nextCursor?: string;
      phase: "ready";
    }
  | { message: string; phase: "error" };

export type TripViewAction =
  | { type: "request" }
  | {
      items: TripSummaryResponse[];
      nextCursor?: string;
      type: "resolve";
    }
  | {
      items: TripSummaryResponse[];
      nextCursor?: string;
      type: "append";
    }
  | { trip: TripSummaryResponse; type: "created" }
  | { type: "unauthenticated" }
  | { message: string; type: "reject" };

export const initialTripState: TripViewState = { phase: "loading" };

export function tripStateReducer(
  state: TripViewState,
  action: TripViewAction,
): TripViewState {
  switch (action.type) {
    case "request":
      return initialTripState;
    case "resolve":
      return {
        items: action.items,
        phase: "ready",
        ...(action.nextCursor ? { nextCursor: action.nextCursor } : {}),
      };
    case "append":
      if (state.phase !== "ready") {
        return state;
      }
      return {
        items: [...state.items, ...action.items],
        phase: "ready",
        ...(action.nextCursor ? { nextCursor: action.nextCursor } : {}),
      };
    case "created":
      if (state.phase !== "ready") {
        return { items: [action.trip], phase: "ready" };
      }
      return {
        ...state,
        items: [
          action.trip,
          ...state.items.filter((trip) => trip.id !== action.trip.id),
        ],
      };
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "reject":
      return { message: action.message, phase: "error" };
  }
}

export function validateTripDraft(draft: TripDraft): TripDraftErrors {
  const errors: TripDraftErrors = {};
  const title = draft.title.trim();

  if (title.length === 0) {
    errors.title = "여행 이름을 입력해 주세요.";
  } else if (title.length > 100) {
    errors.title = "여행 이름은 100자 이하로 입력해 주세요.";
  }

  if (!isIsoDate(draft.startDate)) {
    errors.startDate = "출발일을 선택해 주세요.";
  }
  if (!isIsoDate(draft.endDate)) {
    errors.endDate = "도착일을 선택해 주세요.";
  } else if (!errors.startDate && draft.endDate < draft.startDate) {
    errors.endDate = "도착일은 출발일과 같거나 이후여야 합니다.";
  }

  return errors;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}
