import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface CognitoConfig {
  apiAudience: string;
  clientId: string;
  domain: string;
  webBaseUrl: string;
}

export interface CognitoTokenSet {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

interface TokenEndpointResponse {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  token_type?: unknown;
}

export function readCognitoConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CognitoConfig {
  return {
    apiAudience: required(environment, "DAJEONG_API_AUDIENCE"),
    clientId: required(environment, "DAJEONG_COGNITO_CLIENT_ID"),
    domain: normalizeUrl(required(environment, "DAJEONG_COGNITO_DOMAIN")),
    webBaseUrl: normalizeUrl(required(environment, "DAJEONG_WEB_BASE_URL")),
  };
}

export function createLoginAttempt() {
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return {
    challenge,
    state: randomBytes(32).toString("base64url"),
    verifier,
  };
}

export function buildAuthorizationUrl(
  config: CognitoConfig,
  state: string,
  challenge: string,
): URL {
  const url = new URL("/oauth2/authorize", `${config.domain}/`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: callbackUrl(config),
    resource: config.apiAudience,
    response_type: "code",
    scope: "openid profile email",
    state,
  }).toString();
  return url;
}

export function buildLogoutUrl(config: CognitoConfig): URL {
  const url = new URL("/logout", `${config.domain}/`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.webBaseUrl,
  }).toString();
  return url;
}

export async function exchangeAuthorizationCode(
  config: CognitoConfig,
  code: string,
  verifier: string,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<CognitoTokenSet> {
  return requestTokens(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(config),
    }),
    fetchImplementation,
  );
}

export async function refreshAccessToken(
  config: CognitoConfig,
  refreshToken: string,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<CognitoTokenSet> {
  return requestTokens(
    config,
    new URLSearchParams({
      client_id: config.clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    fetchImplementation,
  );
}

export async function revokeRefreshToken(
  config: CognitoConfig,
  refreshToken: string,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<void> {
  const response = await fetchImplementation(
    new URL("/oauth2/revoke", `${config.domain}/`),
    {
      body: new URLSearchParams({
        client_id: config.clientId,
        token: refreshToken,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Cognito token revoke가 HTTP ${response.status}로 실패했습니다.`);
  }
}

export function matchesLoginState(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function callbackUrl(config: CognitoConfig): string {
  return new URL("/api/auth/callback/cognito", `${config.webBaseUrl}/`).toString();
}

export function normalizeReturnTo(
  value: string | null | undefined,
  fallback = "/me",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    })
  ) {
    return fallback;
  }

  try {
    const baseUrl = new URL("https://dajeong.invalid");
    const url = new URL(value, baseUrl);
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      url.origin !== baseUrl.origin ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\")
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

async function requestTokens(
  config: CognitoConfig,
  body: URLSearchParams,
  fetchImplementation: typeof globalThis.fetch,
): Promise<CognitoTokenSet> {
  const response = await fetchImplementation(
    new URL("/oauth2/token", `${config.domain}/`),
    {
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Cognito token 교환이 HTTP ${response.status}로 실패했습니다.`);
  }

  const payload = (await response.json()) as TokenEndpointResponse;
  if (
    typeof payload.access_token !== "string" ||
    payload.access_token.length === 0 ||
    typeof payload.expires_in !== "number" ||
    !Number.isFinite(payload.expires_in) ||
    payload.expires_in <= 0 ||
    payload.token_type !== "Bearer"
  ) {
    throw new Error("Cognito token 응답 형식이 올바르지 않습니다.");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: Math.floor(payload.expires_in),
    ...(typeof payload.refresh_token === "string" &&
    payload.refresh_token.length > 0
      ? { refreshToken: payload.refresh_token }
      : {}),
  };
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name}이(가) 필요합니다.`);
  }
  return value;
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
