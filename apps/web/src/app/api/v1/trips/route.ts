import {
  createTrip,
  listTrips,
  type CreateTripRequest,
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
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const limitValue = request.nextUrl.searchParams.get("limit");
  const limit = limitValue === null ? undefined : Number(limitValue);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
    return jsonError("limit은 1 이상 50 이하의 정수여야 합니다.", 400);
  }

  try {
    const session = await requestWithApiSession(
      request,
      (baseUrl, accessToken) =>
        listTrips({
          accessToken,
          baseUrl,
          cursor,
          fetch: noStoreFetch,
          limit,
        }),
    );
    const response = NextResponse.json(session.data, {
      headers: { "Cache-Control": "no-store" },
      status: 200,
    });
    applyRefreshedSession(response, session);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(
      error,
      "여행 목록 API에 연결하지 못했습니다.",
    );
  }
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return jsonError("Idempotency-Key가 필요합니다.", 400);
  }

  let body: CreateTripRequest;
  try {
    body = (await request.json()) as CreateTripRequest;
  } catch {
    return jsonError("여행 생성 요청 JSON이 올바르지 않습니다.", 400);
  }

  try {
    const session = await requestWithApiSession(
      request,
      (baseUrl, accessToken) =>
        createTrip({
          accessToken,
          baseUrl,
          fetch: noStoreFetch,
          idempotencyKey,
          request: body,
        }),
    );
    const response = NextResponse.json(session.data, {
      headers: { "Cache-Control": "no-store" },
      status: 200,
    });
    applyRefreshedSession(response, session);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(
      error,
      "여행 생성 API에 연결하지 못했습니다.",
    );
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { message },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}
