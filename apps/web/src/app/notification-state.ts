import type {
  NotificationListResponse,
  NotificationResponse,
} from "@dajeong/api-client";

export type NotificationWorkspaceState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | { message: string; phase: "error" }
  | {
      items: NotificationResponse[];
      nextCursor?: string | null;
      phase: "ready";
    };

export type NotificationWorkspaceAction =
  | { type: "request" }
  | { type: "unauthenticated" }
  | { message: string; type: "reject" }
  | { response: NotificationListResponse; type: "resolve" }
  | { response: NotificationListResponse; type: "append" }
  | { notification: NotificationResponse; type: "read" };

export const initialNotificationState: NotificationWorkspaceState = {
  phase: "loading",
};

export function notificationStateReducer(
  state: NotificationWorkspaceState,
  action: NotificationWorkspaceAction,
): NotificationWorkspaceState {
  switch (action.type) {
    case "request":
      return { phase: "loading" };
    case "unauthenticated":
      return { phase: "unauthenticated" };
    case "reject":
      return { message: action.message, phase: "error" };
    case "resolve":
      return {
        items: action.response.items,
        nextCursor: action.response.nextCursor,
        phase: "ready",
      };
    case "append":
      return state.phase === "ready"
        ? {
            ...state,
            items: mergeNotifications(state.items, action.response.items),
            nextCursor: action.response.nextCursor,
          }
        : state;
    case "read":
      return state.phase === "ready"
        ? {
            ...state,
            items: state.items.map((item) =>
              item.id === action.notification.id ? action.notification : item,
            ),
          }
        : state;
  }
}

export function notificationHref(notification: NotificationResponse): string {
  return (
    `/trips/${encodeURIComponent(notification.tripId)}/disruptions` +
    `#proposal-set-${encodeURIComponent(notification.proposalSetId)}`
  );
}

export function notificationMessage(notification: NotificationResponse): string {
  return `그룹 투표로 ${notification.winnerTitle} 후보가 일정 v${notification.itineraryVersionNumber}에 반영됐어요.`;
}

function mergeNotifications(
  current: readonly NotificationResponse[],
  incoming: readonly NotificationResponse[],
): NotificationResponse[] {
  const seen = new Set(current.map((item) => item.id));
  return [
    ...current,
    ...incoming.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    }),
  ];
}
