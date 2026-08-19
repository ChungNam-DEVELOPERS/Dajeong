import { publishItineraryDraft } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  readRevision,
  sessionJsonResponse,
} from "../../../../_shared/itinerary-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const revision = readRevision(request);
  if (revision === null) {
    return jsonError("If-Match에 최신 일정 revision이 필요합니다.", 400);
  }
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return jsonError("Idempotency-Key가 필요합니다.", 400);
  }

  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      publishItineraryDraft({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        idempotencyKey,
        revision,
        tripId,
      }),
    "일정 발행 API에 연결하지 못했습니다.",
  );
}
