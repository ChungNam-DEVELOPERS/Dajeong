import "server-only";

import { ApiClientError } from "@dajeong/api-client";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextServerResponse } from "next/server";

import {
  readCognitoConfig,
  refreshAccessToken,
  type CognitoConfig,
  type CognitoTokenSet,
} from "./cognito";
import {
  authCookieNames,
  clearSessionCookies,
  setSessionCookies,
} from "./cookies";

interface RefreshedSession {
  config: CognitoConfig;
  fallbackRefreshToken: string;
  tokens: CognitoTokenSet;
}

export interface ApiSessionResult<T> {
  data: T;
  refreshedSession?: RefreshedSession;
}

export class ApiSessionAuthenticationError extends Error {
  constructor() {
    super("로그인이 필요하거나 만료되었습니다.");
    this.name = "ApiSessionAuthenticationError";
  }
}

export class ApiSessionConfigurationError extends Error {
  constructor() {
    super("웹 API base URL이 구성되지 않았습니다.");
    this.name = "ApiSessionConfigurationError";
  }
}

export async function requestWithApiSession<T>(
  request: NextRequest,
  operation: (baseUrl: string, accessToken: string) => Promise<T>,
): Promise<ApiSessionResult<T>> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new ApiSessionConfigurationError();
  }

  const accessToken = request.cookies.get(authCookieNames.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookieNames.refreshToken)?.value;

  if (accessToken) {
    try {
      return { data: await operation(apiBaseUrl, accessToken) };
    } catch (error: unknown) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        throw error;
      }
    }
  }

  if (!refreshToken) {
    throw new ApiSessionAuthenticationError();
  }

  try {
    const config = readCognitoConfig();
    const tokens = await refreshAccessToken(config, refreshToken);
    return {
      data: await operation(apiBaseUrl, tokens.accessToken),
      refreshedSession: {
        config,
        fallbackRefreshToken: refreshToken,
        tokens,
      },
    };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && error.status !== 401) {
      throw error;
    }
    throw new ApiSessionAuthenticationError();
  }
}

export function applyRefreshedSession(
  response: NextResponse,
  session: ApiSessionResult<unknown>,
) {
  if (!session.refreshedSession) {
    return;
  }

  setSessionCookies(
    response,
    session.refreshedSession.config,
    session.refreshedSession.tokens,
    session.refreshedSession.fallbackRefreshToken,
  );
}

export function apiSessionErrorResponse(
  error: unknown,
  upstreamMessage: string,
) {
  if (error instanceof ApiSessionConfigurationError) {
    return jsonError(error.message, 500);
  }

  if (error instanceof ApiSessionAuthenticationError) {
    const response = jsonError("로그인이 필요하거나 만료되었습니다.", 401);
    try {
      clearSessionCookies(response, readCognitoConfig());
    } catch {
      // Missing auth configuration is already represented by the response.
    }
    return response;
  }

  if (
    error instanceof ApiClientError &&
    [400, 403, 404, 409, 410].includes(error.status)
  ) {
    return NextServerResponse.json(error.responseBody, {
      headers: { "Cache-Control": "no-store" },
      status: error.status,
    });
  }

  const upstreamStatus = error instanceof ApiClientError ? error.status : null;
  return NextServerResponse.json(
    { message: upstreamMessage, upstreamStatus },
    { headers: { "Cache-Control": "no-store" }, status: 502 },
  );
}

function jsonError(message: string, status: number) {
  return NextServerResponse.json(
    { message },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}
