import {
  createDisruption,
  listDisruptions,
  type CreateDisruptionRequest,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  sessionJsonResponse,
} from "../../_shared/itinerary-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      listDisruptions({ accessToken, baseUrl, fetch: noStoreFetch, tripId }),
    "문제 신고 목록 API에 연결하지 못했습니다.",
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return jsonError("Idempotency-Key가 필요합니다.", 400);
  }
  let body: CreateDisruptionRequest;
  try {
    body = (await request.json()) as CreateDisruptionRequest;
  } catch {
    return jsonError("문제 신고 요청 JSON이 올바르지 않습니다.", 400);
  }
  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      createDisruption({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        idempotencyKey,
        request: body,
        tripId,
      }),
    "문제 신고 API에 연결하지 못했습니다.",
  );
}
