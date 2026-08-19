import {
  ApiClientError,
  getCurrentUser,
  type CurrentUserResponse,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  readCognitoConfig,
  refreshAccessToken,
} from "../../../../auth/cognito";
import {
  authCookieNames,
  clearSessionCookies,
  setSessionCookies,
} from "../../../../auth/cookies";

const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return jsonError("웹 API base URL이 구성되지 않았습니다.", 500);
  }

  const accessToken = request.cookies.get(authCookieNames.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookieNames.refreshToken)?.value;

  if (accessToken) {
    try {
      return currentUserResponse(
        await requestCurrentUser(apiBaseUrl, accessToken),
      );
    } catch (error: unknown) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        return upstreamError(error);
      }
    }
  }

  if (!refreshToken) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  try {
    const config = readCognitoConfig();
    const tokens = await refreshAccessToken(config, refreshToken);
    const user = await requestCurrentUser(apiBaseUrl, tokens.accessToken);
    const response = currentUserResponse(user);
    setSessionCookies(response, config, tokens, refreshToken);
    return response;
  } catch (error: unknown) {
    const response = jsonError(
      error instanceof ApiClientError && error.status !== 401
        ? "사용자 API에 연결하지 못했습니다."
        : "로그인이 만료되었습니다.",
      error instanceof ApiClientError && error.status !== 401 ? 502 : 401,
    );
    try {
      clearSessionCookies(response, readCognitoConfig());
    } catch {
      // Missing auth configuration is already represented by the response.
    }
    return response;
  }
}

function requestCurrentUser(baseUrl: string, accessToken: string) {
  return getCurrentUser({
    accessToken,
    baseUrl,
    fetch: noStoreFetch,
  });
}

function currentUserResponse(user: CurrentUserResponse) {
  return NextResponse.json(user, {
    headers: { "Cache-Control": "no-store" },
    status: 200,
  });
}

function upstreamError(error: unknown) {
  const upstreamStatus = error instanceof ApiClientError ? error.status : null;
  return NextResponse.json(
    {
      message: "사용자 API에 연결하지 못했습니다.",
      upstreamStatus,
    },
    { headers: { "Cache-Control": "no-store" }, status: 502 },
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { message },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}
