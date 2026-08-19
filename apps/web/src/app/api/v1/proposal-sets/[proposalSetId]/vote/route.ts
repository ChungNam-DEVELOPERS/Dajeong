import {
  upsertProposalVote,
  withdrawProposalVote,
  type VoteRequest,
} from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  jsonError,
  noStoreFetch,
  sessionJsonResponse,
} from "../../../trips/_shared/itinerary-route";

type VoteParams = Promise<{ proposalSetId: string }>;

export async function PUT(
  request: NextRequest,
  { params }: { params: VoteParams },
) {
  let body: VoteRequest;
  try {
    body = (await request.json()) as VoteRequest;
  } catch {
    return jsonError("투표 요청 JSON이 올바르지 않습니다.", 400);
  }
  const { proposalSetId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      upsertProposalVote({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        proposalSetId,
        request: body,
      }),
    "투표 API에 연결하지 못했습니다.",
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: VoteParams },
) {
  const { proposalSetId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      withdrawProposalVote({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        proposalSetId,
      }),
    "투표 철회 API에 연결하지 못했습니다.",
  );
}
