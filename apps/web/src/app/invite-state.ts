import type { JoinedTripResponse } from "@dajeong/api-client";

export type InviteJoinState =
  | { phase: "joining" }
  | { phase: "unauthenticated" }
  | { phase: "gone" }
  | { phase: "full" }
  | { message: string; phase: "error" }
  | { phase: "joined"; trip: JoinedTripResponse };

export type InviteJoinAction =
  | { type: "request" }
  | { type: "unauthenticated" }
  | { type: "gone" }
  | { type: "full" }
  | { message: string; type: "reject" }
  | { trip: JoinedTripResponse; type: "resolve" };

export const initialInviteJoinState: InviteJoinState = { phase: "joining" };

export function inviteJoinStateReducer(
  _state: InviteJoinState,
  action: InviteJoinAction,
): InviteJoinState {
  switch (action.type) {
    case "request":
      return initialInviteJoinState;
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "gone":
      return { phase: "gone" };
    case "full":
      return { phase: "full" };
    case "reject":
      return { message: action.message, phase: "error" };
    case "resolve":
      return { phase: "joined", trip: action.trip };
  }
}
