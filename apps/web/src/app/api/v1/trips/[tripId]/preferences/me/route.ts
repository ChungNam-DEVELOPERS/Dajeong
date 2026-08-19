import {
  getMyPrivatePreference,
  saveMyPrivatePreference,
  type PrivatePreferenceRequest,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  sessionJsonResponse,
} from "../../../_shared/itinerary-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      getMyPrivatePreference({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        tripId,
      }),
    "내 비공개 선호 API에 연결하지 못했습니다.",
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  let body: PrivatePreferenceRequest;
  try {
    body = (await request.json()) as PrivatePreferenceRequest;
  } catch {
    return jsonError("선호 요청 JSON이 올바르지 않습니다.", 400);
  }

  const { tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      saveMyPrivatePreference({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        request: body,
        tripId,
      }),
    "비공개 선호 저장 API에 연결하지 못했습니다.",
  );
}
