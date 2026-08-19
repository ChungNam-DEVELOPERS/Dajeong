import { startDisruptionReplan } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  sessionJsonResponse,
} from "../../../trips/_shared/itinerary-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ disruptionId: string }> },
) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return jsonError("Idempotency-Key가 필요합니다.", 400);
  }
  const { disruptionId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      startDisruptionReplan({
        accessToken,
        baseUrl,
        disruptionId,
        fetch: noStoreFetch,
        idempotencyKey,
      }),
    "재조정 시작 API에 연결하지 못했습니다.",
  );
}
