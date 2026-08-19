import type { SystemHealthResponse } from "@dajeong/api-client";

export type HealthViewState =
  | { phase: "loading" }
  | { phase: "up"; response: SystemHealthResponse }
  | { phase: "down"; response: SystemHealthResponse }
  | { message: string; phase: "error" };

export type HealthViewAction =
  | { type: "request" }
  | { response: SystemHealthResponse; type: "resolve" }
  | { message: string; type: "reject" };

export const initialHealthState: HealthViewState = { phase: "loading" };

export function healthStateReducer(
  _state: HealthViewState,
  action: HealthViewAction,
): HealthViewState {
  switch (action.type) {
    case "request":
      return initialHealthState;
    case "resolve":
      return action.response.status === "UP"
        ? { phase: "up", response: action.response }
        : { phase: "down", response: action.response };
    case "reject":
      return { message: action.message, phase: "error" };
  }
}
