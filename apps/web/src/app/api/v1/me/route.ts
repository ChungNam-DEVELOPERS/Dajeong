import {
  deleteCurrentUser,
  getCurrentUser,
  type CurrentUserResponse,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  apiSessionErrorResponse,
  applyRefreshedSession,
  requestWithApiSession,
} from "../../../../auth/api-session";
import {
  readCognitoConfig,
  revokeRefreshToken,
} from "../../../../auth/cognito";
import {
  authCookieNames,
  clearSessionCookies,
} from "../../../../auth/cookies";

const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

export async function GET(request: NextRequest) {
  try {
    const session = await requestWithApiSession(
      request,
      requestCurrentUser,
    );
    const response = currentUserResponse(session.data);
    applyRefreshedSession(response, session);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(
      error,
      "사용자 API에 연결하지 못했습니다.",
    );
  }
}

export async function DELETE(request: NextRequest) {
  let config;
  try {
    config = readCognitoConfig();
  } catch {
    return NextResponse.json(
      { message: "계정 삭제 설정을 준비하지 못했습니다." },
      { headers: { "Cache-Control": "no-store" }, status: 500 },
    );
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(config.webBaseUrl).origin) {
    return NextResponse.json(
      { message: "허용되지 않은 요청입니다." },
      { headers: { "Cache-Control": "no-store" }, status: 403 },
    );
  }

  try {
    const session = await requestWithApiSession(
      request,
      (baseUrl, accessToken) =>
        deleteCurrentUser({
          accessToken,
          baseUrl,
          fetch: noStoreFetch,
        }),
    );
    const refreshToken =
      session.refreshedSession?.tokens.refreshToken ??
      request.cookies.get(authCookieNames.refreshToken)?.value;
    if (refreshToken) {
      await revokeRefreshToken(config, refreshToken).catch(() => undefined);
    }

    const response = new NextResponse(null, {
      headers: { "Cache-Control": "no-store" },
      status: 204,
    });
    clearSessionCookies(response, config);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(
      error,
      "계정 삭제 API에 연결하지 못했습니다.",
    );
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
