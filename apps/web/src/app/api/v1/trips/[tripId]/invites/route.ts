import { issueTripInvite } from "@dajeong/api-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  apiSessionErrorResponse,
  applyRefreshedSession,
  requestWithApiSession,
} from "@/auth/api-session";

const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

type RouteContext = {
  params: Promise<{ tripId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { tripId } = await context.params;

  try {
    const session = await requestWithApiSession(
      request,
      (baseUrl, accessToken) =>
        issueTripInvite({
          accessToken,
          baseUrl,
          fetch: noStoreFetch,
          tripId,
        }),
    );
    const response = NextResponse.json(session.data, {
      headers: { "Cache-Control": "no-store" },
      status: 201,
    });
    applyRefreshedSession(response, session);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(
      error,
      "여행 초대 발급 API에 연결하지 못했습니다.",
    );
  }
}
