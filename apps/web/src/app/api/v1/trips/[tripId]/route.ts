import { getTrip } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  noStoreFetch,
  sessionJsonResponse,
} from "../_shared/itinerary-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      getTrip({ accessToken, baseUrl, fetch: noStoreFetch, tripId }),
    "여행 상세 API에 연결하지 못했습니다.",
  );
}
