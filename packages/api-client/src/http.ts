export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
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

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  if (normalizedBaseUrl.length === 0) {
    throw new TypeError("API baseUrl은 비어 있을 수 없습니다.");
  }

  return `${normalizedBaseUrl}${path}`;
}

export function jsonHeaders(accessToken?: string): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

export async function readErrorBody(response: Response): Promise<unknown> {
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
