import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

type ListNotificationsOperation = paths[typeof NOTIFICATIONS_PATH]["get"];
type ReadNotificationOperation =
  paths["/api/v1/notifications/{notificationId}/read"]["post"];

export type NotificationListResponse =
  ListNotificationsOperation["responses"][200]["content"]["application/json"];
export type NotificationResponse =
  ReadNotificationOperation["responses"][200]["content"]["application/json"];
export type NotificationType = NotificationResponse["type"];

export interface ListNotificationsOptions extends ApiClientOptions {
  accessToken?: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface ReadNotificationOptions extends ApiClientOptions {
  accessToken?: string;
  notificationId: string;
  signal?: AbortSignal;
}

export async function listNotifications(
  options: ListNotificationsOptions,
): Promise<NotificationListResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const url = new URL(buildApiUrl(options.baseUrl, NOTIFICATIONS_PATH));
  if (options.cursor) {
    url.searchParams.set("cursor", options.cursor);
  }
  if (options.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  const response = await fetchImplementation(url, {
    headers: jsonHeaders(options.accessToken),
    method: "GET",
    signal: options.signal,
  });
  if (response.status === 200) {
    return (await response.json()) as NotificationListResponse;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}

export async function readNotification(
  options: ReadNotificationOptions,
): Promise<NotificationResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const response = await fetchImplementation(
    buildApiUrl(
      options.baseUrl,
      `${NOTIFICATIONS_PATH}/${encodeURIComponent(options.notificationId)}/read`,
    ),
    {
      headers: jsonHeaders(options.accessToken),
      method: "POST",
      signal: options.signal,
    },
  );
  if (response.status === 200) {
    return (await response.json()) as NotificationResponse;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}
