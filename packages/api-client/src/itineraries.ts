import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

type CurrentOperation =
  paths["/api/v1/trips/{tripId}/itineraries/current"]["get"];
type TimelineOperation =
  paths["/api/v1/trips/{tripId}/itineraries/timeline"]["get"];
type DraftOperation =
  paths["/api/v1/trips/{tripId}/itineraries/draft"]["get"];
type AddSlotOperation =
  paths["/api/v1/trips/{tripId}/itineraries/draft/slots"]["post"];

export type ItineraryDraftResponse =
  DraftOperation["responses"][200]["content"]["application/json"];
export type ItineraryVersionResponse =
  CurrentOperation["responses"][200]["content"]["application/json"];
export type ItineraryTimelineResponse =
  TimelineOperation["responses"][200]["content"]["application/json"];
export type ItineraryTimelineItem = ItineraryTimelineResponse["items"][number];
export type ItinerarySlotRequest =
  AddSlotOperation["requestBody"]["content"]["application/json"];
export type ItinerarySlotResponse = ItineraryDraftResponse["slots"][number];

export interface ItineraryRequestOptions extends ApiClientOptions {
  accessToken?: string;
  signal?: AbortSignal;
  tripId: string;
}

export interface ItineraryRevisionRequestOptions
  extends ItineraryRequestOptions {
  revision: number;
}

export interface ItineraryTimelineRequestOptions
  extends ItineraryRequestOptions {
  cursor?: string;
  limit?: number;
}

export interface AddItineraryDraftSlotOptions
  extends ItineraryRevisionRequestOptions {
  idempotencyKey: string;
  request: ItinerarySlotRequest;
}

export interface UpdateItineraryDraftSlotOptions
  extends ItineraryRevisionRequestOptions {
  request: ItinerarySlotRequest;
  slotId: string;
}

export interface DeleteItineraryDraftSlotOptions
  extends ItineraryRevisionRequestOptions {
  slotId: string;
}

export interface PublishItineraryDraftOptions
  extends ItineraryRevisionRequestOptions {
  idempotencyKey: string;
}

export async function getItineraryDraft(
  options: ItineraryRequestOptions,
): Promise<ItineraryDraftResponse> {
  return requestJson<ItineraryDraftResponse>(
    options,
    draftPath(options.tripId),
    "GET",
    [200],
  );
}

export async function getCurrentItinerary(
  options: ItineraryRequestOptions,
): Promise<ItineraryVersionResponse> {
  return requestJson<ItineraryVersionResponse>(
    options,
    currentPath(options.tripId),
    "GET",
    [200],
  );
}

export async function getItineraryTimeline(
  options: ItineraryTimelineRequestOptions,
): Promise<ItineraryTimelineResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const url = new URL(buildApiUrl(options.baseUrl, timelinePath(options.tripId)));
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
    return (await response.json()) as ItineraryTimelineResponse;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}

export async function addItineraryDraftSlot(
  options: AddItineraryDraftSlotOptions,
): Promise<ItineraryDraftResponse> {
  return requestJson<ItineraryDraftResponse>(
    options,
    draftSlotsPath(options.tripId),
    "POST",
    [200, 201],
    options.request,
    options.idempotencyKey,
  );
}

export async function updateItineraryDraftSlot(
  options: UpdateItineraryDraftSlotOptions,
): Promise<ItineraryDraftResponse> {
  return requestJson<ItineraryDraftResponse>(
    options,
    draftSlotPath(options.tripId, options.slotId),
    "PATCH",
    [200],
    options.request,
  );
}

export async function deleteItineraryDraftSlot(
  options: DeleteItineraryDraftSlotOptions,
): Promise<ItineraryDraftResponse> {
  return requestJson<ItineraryDraftResponse>(
    options,
    draftSlotPath(options.tripId, options.slotId),
    "DELETE",
    [200],
  );
}

export async function publishItineraryDraft(
  options: PublishItineraryDraftOptions,
): Promise<ItineraryVersionResponse> {
  return requestJson<ItineraryVersionResponse>(
    options,
    publishPath(options.tripId),
    "POST",
    [200, 201],
    undefined,
    options.idempotencyKey,
  );
}

async function requestJson<T>(
  options: ItineraryRequestOptions,
  path: string,
  method: "DELETE" | "GET" | "PATCH" | "POST",
  successStatuses: number[],
  requestBody?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const headers = jsonHeaders(options.accessToken);
  if ("revision" in options) {
    headers.set("If-Match", `"${options.revision}"`);
  }
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchImplementation(buildApiUrl(options.baseUrl, path), {
    ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
    headers,
    method,
    signal: options.signal,
  });
  if (successStatuses.includes(response.status)) {
    return (await response.json()) as T;
  }
  throw new ApiClientError(response.status, await readErrorBody(response));
}

function currentPath(tripId: string) {
  return `/api/v1/trips/${encodeURIComponent(tripId)}/itineraries/current`;
}

function timelinePath(tripId: string) {
  return `/api/v1/trips/${encodeURIComponent(tripId)}/itineraries/timeline`;
}

function draftPath(tripId: string) {
  return `/api/v1/trips/${encodeURIComponent(tripId)}/itineraries/draft`;
}

function draftSlotsPath(tripId: string) {
  return `${draftPath(tripId)}/slots`;
}

function draftSlotPath(tripId: string, slotId: string) {
  return `${draftSlotsPath(tripId)}/${encodeURIComponent(slotId)}`;
}

function publishPath(tripId: string) {
  return `${draftPath(tripId)}/publish`;
}
