import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";

const TRIPS_PATH = "/api/v1/trips";

type TripsPath = paths[typeof TRIPS_PATH];
type CreateTripOperation = TripsPath["post"];
type ListTripsOperation = TripsPath["get"];

export type CreateTripRequest =
  CreateTripOperation["requestBody"]["content"]["application/json"];
export type TripSummaryResponse =
  CreateTripOperation["responses"][201]["content"]["application/json"];
export type TripListResponse =
  ListTripsOperation["responses"][200]["content"]["application/json"];

export interface CreateTripRequestOptions extends ApiClientOptions {
  accessToken?: string;
  idempotencyKey: string;
  request: CreateTripRequest;
  signal?: AbortSignal;
}

export interface ListTripsRequestOptions extends ApiClientOptions {
  accessToken?: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function createTrip(
  options: CreateTripRequestOptions,
): Promise<TripSummaryResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const headers = jsonHeaders(options.accessToken);
  headers.set("Content-Type", "application/json");
  headers.set("Idempotency-Key", options.idempotencyKey);

  const response = await fetchImplementation(
    buildApiUrl(options.baseUrl, TRIPS_PATH),
    {
      body: JSON.stringify(options.request),
      headers,
      method: "POST",
      signal: options.signal,
    },
  );

  if (response.status === 200 || response.status === 201) {
    return (await response.json()) as TripSummaryResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}

export async function listTrips(
  options: ListTripsRequestOptions,
): Promise<TripListResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const url = new URL(buildApiUrl(options.baseUrl, TRIPS_PATH));
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
    return (await response.json()) as TripListResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}
