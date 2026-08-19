import {
  deleteItineraryDraftSlot,
  type ItinerarySlotRequest,
  updateItineraryDraftSlot,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  readRevision,
  sessionJsonResponse,
} from "../../../../../_shared/itinerary-route";

type SlotParams = Promise<{ slotId: string; tripId: string }>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: SlotParams },
) {
  const revision = readRevision(request);
  if (revision === null) {
    return jsonError("If-Match에 최신 일정 revision이 필요합니다.", 400);
  }
  let body: ItinerarySlotRequest;
  try {
    body = (await request.json()) as ItinerarySlotRequest;
  } catch {
    return jsonError("일정 슬롯 요청 JSON이 올바르지 않습니다.", 400);
  }

  const { slotId, tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      updateItineraryDraftSlot({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        request: body,
        revision,
        slotId,
        tripId,
      }),
    "일정 슬롯 수정 API에 연결하지 못했습니다.",
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: SlotParams },
) {
  const revision = readRevision(request);
  if (revision === null) {
    return jsonError("If-Match에 최신 일정 revision이 필요합니다.", 400);
  }
  const { slotId, tripId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      deleteItineraryDraftSlot({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        revision,
        slotId,
        tripId,
      }),
    "일정 슬롯 삭제 API에 연결하지 못했습니다.",
  );
}
