import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

type MyPreferenceOperation =
  paths["/api/v1/trips/{tripId}/preferences/me"]["get"];
type SavePreferenceOperation =
  paths["/api/v1/trips/{tripId}/preferences/me"]["put"];
type PreferenceStatusOperation =
  paths["/api/v1/trips/{tripId}/preferences/status"]["get"];

export type PrivatePreferenceRequest =
  SavePreferenceOperation["requestBody"]["content"]["application/json"];
export type PrivatePreferenceResponse =
  MyPreferenceOperation["responses"][200]["content"]["application/json"];
export type PreferenceStatusResponse =
  PreferenceStatusOperation["responses"][200]["content"]["application/json"];
export type PreferenceCategory =
  PrivatePreferenceRequest["preferredCategories"][number];
export type PreferencePriority = PrivatePreferenceRequest["priorities"][number];
export type PreferenceMemberStatus = PreferenceStatusResponse["members"][number];

export interface PreferenceRequestOptions extends ApiClientOptions {
  accessToken?: string;
  signal?: AbortSignal;
  tripId: string;
}

export interface SavePrivatePreferenceOptions extends PreferenceRequestOptions {
  request: PrivatePreferenceRequest;
}

export async function getMyPrivatePreference(
  options: PreferenceRequestOptions,
): Promise<PrivatePreferenceResponse> {
  return requestJson<PrivatePreferenceResponse>(
    options,
    myPreferencePath(options.tripId),
    "GET",
  );
}

export async function saveMyPrivatePreference(
  options: SavePrivatePreferenceOptions,
): Promise<PrivatePreferenceResponse> {
  return requestJson<PrivatePreferenceResponse>(
    options,
    myPreferencePath(options.tripId),
    "PUT",
    options.request,
  );
}

export async function getPreferenceSubmissionStatus(
  options: PreferenceRequestOptions,
): Promise<PreferenceStatusResponse> {
  return requestJson<PreferenceStatusResponse>(
    options,
    preferenceStatusPath(options.tripId),
    "GET",
  );
}

async function requestJson<Response>(
  options: PreferenceRequestOptions,
  path: string,
  method: "GET" | "PUT",
  requestBody?: unknown,
): Promise<Response> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const headers = jsonHeaders(options.accessToken);
  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchImplementation(buildApiUrl(options.baseUrl, path), {
    ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
    headers,
    method,
    signal: options.signal,
  });
  if (response.status === 200) {
    return (await response.json()) as Response;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}

function myPreferencePath(tripId: string) {
  return `/api/v1/trips/${encodeURIComponent(tripId)}/preferences/me`;
}

function preferenceStatusPath(tripId: string) {
  return `/api/v1/trips/${encodeURIComponent(tripId)}/preferences/status`;
}
