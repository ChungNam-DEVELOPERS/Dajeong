import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

const ISSUE_INVITE_PATH = "/api/v1/trips/{tripId}/invites";
const JOIN_INVITE_PATH = "/api/v1/invites/{code}/join";

type IssueInviteOperation = paths[typeof ISSUE_INVITE_PATH]["post"];
type JoinInviteOperation = paths[typeof JOIN_INVITE_PATH]["post"];

export type InviteResponse =
  IssueInviteOperation["responses"][201]["content"]["application/json"];
export type JoinedTripResponse =
  JoinInviteOperation["responses"][200]["content"]["application/json"];

export interface IssueTripInviteOptions extends ApiClientOptions {
  accessToken?: string;
  signal?: AbortSignal;
  tripId: string;
}

export interface JoinTripByInviteOptions extends ApiClientOptions {
  accessToken?: string;
  code: string;
  signal?: AbortSignal;
}

export async function issueTripInvite(
  options: IssueTripInviteOptions,
): Promise<InviteResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const path = ISSUE_INVITE_PATH.replace(
    "{tripId}",
    encodeURIComponent(options.tripId),
  );
  const response = await fetchImplementation(buildApiUrl(options.baseUrl, path), {
    headers: jsonHeaders(options.accessToken),
    method: "POST",
    signal: options.signal,
  });

  if (response.status === 201) {
    return (await response.json()) as InviteResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}

export async function joinTripByInvite(
  options: JoinTripByInviteOptions,
): Promise<JoinedTripResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const path = JOIN_INVITE_PATH.replace(
    "{code}",
    encodeURIComponent(options.code),
  );
  const response = await fetchImplementation(buildApiUrl(options.baseUrl, path), {
    headers: jsonHeaders(options.accessToken),
    method: "POST",
    signal: options.signal,
  });

  if (response.status === 200 || response.status === 201) {
    return (await response.json()) as JoinedTripResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}
