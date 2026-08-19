import { listNotifications } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  sessionJsonResponse,
} from "../trips/_shared/itinerary-route";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const limitValue = request.nextUrl.searchParams.get("limit");
  const limit = limitValue === null ? undefined : Number(limitValue);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
    return jsonError("limit은 1 이상 50 이하의 정수여야 합니다.", 400);
  }
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      listNotifications({
        accessToken,
        baseUrl,
        cursor,
        fetch: noStoreFetch,
        limit,
      }),
    "알림 목록 API에 연결하지 못했습니다.",
  );
}
