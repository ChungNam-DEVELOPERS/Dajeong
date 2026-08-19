import {
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
