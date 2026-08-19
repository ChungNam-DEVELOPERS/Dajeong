import type { CurrentUserResponse } from "@dajeong/api-client";

export type MeViewState =
  | { phase: "loading" }
  | {
      deletion: AccountDeletionState;
      phase: "authenticated";
      user: CurrentUserResponse;
    }
  | { phase: "unauthenticated" }
  | { phase: "deleted" }
  | { message: string; phase: "error" };

export type AccountDeletionState =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "deleting" }
  | { message: string; phase: "error" };

export type MeViewAction =
  | { type: "request" }
  | { type: "resolve"; user: CurrentUserResponse }
  | { type: "unauthenticated" }
  | { type: "beginDeletion" }
  | { type: "cancelDeletion" }
  | { type: "requestDeletion" }
  | { type: "deletionSucceeded" }
  | { message: string; type: "deletionFailed" }
  | { message: string; type: "reject" };

export const initialMeState: MeViewState = { phase: "loading" };

export function meStateReducer(
  _state: MeViewState,
  action: MeViewAction,
): MeViewState {
  switch (action.type) {
    case "request":
      return { phase: "loading" };
    case "resolve":
      return {
        deletion: { phase: "idle" },
        phase: "authenticated",
        user: action.user,
      };
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "beginDeletion":
      return withDeletionState(_state, { phase: "confirming" });
    case "cancelDeletion":
      return withDeletionState(_state, { phase: "idle" });
    case "requestDeletion":
      return withDeletionState(_state, { phase: "deleting" });
    case "deletionSucceeded":
      return { phase: "deleted" };
    case "deletionFailed":
      return withDeletionState(_state, {
        message: action.message,
        phase: "error",
      });
    case "reject":
      return { message: action.message, phase: "error" };
  }
}

function withDeletionState(
  state: MeViewState,
  deletion: AccountDeletionState,
): MeViewState {
  if (state.phase !== "authenticated") {
    return state;
  }
  return { ...state, deletion };
}
