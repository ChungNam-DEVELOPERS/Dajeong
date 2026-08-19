import { readNotification } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  noStoreFetch,
  sessionJsonResponse,
} from "../../../trips/_shared/itinerary-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      readNotification({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        notificationId,
      }),
    "알림 읽음 처리 API에 연결하지 못했습니다.",
  );
}
