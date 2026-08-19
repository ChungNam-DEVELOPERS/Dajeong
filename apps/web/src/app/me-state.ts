import type { CurrentUserResponse } from "@dajeong/api-client";

export type MeViewState =
  | { phase: "loading" }
  | { phase: "authenticated"; user: CurrentUserResponse }
  | { phase: "unauthenticated" }
  | { message: string; phase: "error" };

export type MeViewAction =
  | { type: "request" }
  | { type: "resolve"; user: CurrentUserResponse }
  | { type: "unauthenticated" }
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
      return { phase: "authenticated", user: action.user };
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "reject":
      return { message: action.message, phase: "error" };
  }
}
