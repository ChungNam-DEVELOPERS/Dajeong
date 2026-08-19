import type { paths } from "./generated/schema";

const SYSTEM_HEALTH_PATH = "/api/v1/system/health";

type SystemHealthOperation = paths[typeof SYSTEM_HEALTH_PATH]["get"];
type SystemHealthOkResponse =
  SystemHealthOperation["responses"][200]["content"]["application/json"];
type SystemHealthUnavailableResponse =
  SystemHealthOperation["responses"][503]["content"]["application/json"];

export type SystemHealthResponse =
  | SystemHealthOkResponse
  | SystemHealthUnavailableResponse;

export type SystemHealthStatus = SystemHealthResponse["status"];

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export interface SystemHealthRequestOptions extends ApiClientOptions {
  signal?: AbortSignal;
}

export interface DajeongApiClient {
  getSystemHealth(options?: { signal?: AbortSignal }): Promise<SystemHealthResponse>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly responseBody: unknown;

  constructor(status: number, responseBody: unknown) {
    super(`다정 API 요청이 HTTP ${status} 상태로 실패했습니다.`);
    this.name = "ApiClientError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function createApiClient(options: ApiClientOptions): DajeongApiClient {
  return {
    getSystemHealth: (requestOptions = {}) =>
      getSystemHealth({ ...options, ...requestOptions }),
  };
}

export async function getSystemHealth(
  options: SystemHealthRequestOptions,
): Promise<SystemHealthResponse> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const response = await fetchImplementation(buildUrl(options.baseUrl), {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
    signal: options.signal,
  });

  if (response.status === 200 || response.status === 503) {
    return (await response.json()) as SystemHealthResponse;
  }

  throw new ApiClientError(response.status, await readErrorBody(response));
}

function buildUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  if (normalizedBaseUrl.length === 0) {
    throw new TypeError("API baseUrl은 비어 있을 수 없습니다.");
  }

  return `${normalizedBaseUrl}${SYSTEM_HEALTH_PATH}`;
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
