import type { paths } from "./generated/schema";
import {
  ApiClientError,
  buildApiUrl,
  jsonHeaders,
  readErrorBody,
  type ApiClientOptions,
} from "./http.ts";
import {
  createTrip,
  listTrips,
  type CreateTripRequest,
  type TripListResponse,
  type TripSummaryResponse,
} from "./trips.ts";

export { ApiClientError } from "./http.ts";
export type { ApiClientOptions } from "./http.ts";

const SYSTEM_HEALTH_PATH = "/api/v1/system/health";
const CURRENT_USER_PATH = "/api/v1/me";

type SystemHealthOperation = paths[typeof SYSTEM_HEALTH_PATH]["get"];
type SystemHealthOkResponse =
  SystemHealthOperation["responses"][200]["content"]["application/json"];
type SystemHealthUnavailableResponse =
  SystemHealthOperation["responses"][503]["content"]["application/json"];

export type SystemHealthResponse =
  | SystemHealthOkResponse
  | SystemHealthUnavailableResponse;

export type SystemHealthStatus = SystemHealthResponse["status"];

type CurrentUserOperation = paths[typeof CURRENT_USER_PATH]["get"];
export type CurrentUserResponse =
  CurrentUserOperation["responses"][200]["content"]["application/json"];

export interface SystemHealthRequestOptions extends ApiClientOptions {
  signal?: AbortSignal;
}

export interface CurrentUserRequestOptions extends ApiClientOptions {
  accessToken?: string;
  signal?: AbortSignal;
}

export interface DajeongApiClient {
  createTrip(
    request: CreateTripRequest,
    options: {
      accessToken?: string;
      idempotencyKey: string;
      signal?: AbortSignal;
    },
  ): Promise<TripSummaryResponse>;
  getCurrentUser(options?: {
    accessToken?: string;
    signal?: AbortSignal;
  }): Promise<CurrentUserResponse>;
  getSystemHealth(options?: { signal?: AbortSignal }): Promise<SystemHealthResponse>;
  listTrips(options?: {
    accessToken?: string;
    cursor?: string;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<TripListResponse>;
}

export function createApiClient(options: ApiClientOptions): DajeongApiClient {
  return {
    createTrip: (request, requestOptions) =>
      createTrip({ ...options, ...requestOptions, request }),
    getCurrentUser: (requestOptions = {}) =>
      getCurrentUser({ ...options, ...requestOptions }),
    getSystemHealth: (requestOptions = {}) =>
      getSystemHealth({ ...options, ...requestOptions }),
    listTrips: (requestOptions = {}) =>
      listTrips({ ...options, ...requestOptions }),
  };
}

export async function getSystemHealth(
  options: SystemHealthRequestOptions,
): Promise<SystemHealthResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const response = await fetchImplementation(
    buildApiUrl(options.baseUrl, SYSTEM_HEALTH_PATH),
    {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
      signal: options.signal,
    },
  );

  if (response.status === 200 || response.status === 503) {
    return (await response.json()) as SystemHealthResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}

export async function getCurrentUser(
  options: CurrentUserRequestOptions,
): Promise<CurrentUserResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const response = await fetchImplementation(
    buildApiUrl(options.baseUrl, CURRENT_USER_PATH),
    {
      headers: jsonHeaders(options.accessToken),
      method: "GET",
      signal: options.signal,
    },
  );

  if (response.status === 200) {
    return (await response.json()) as CurrentUserResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}
