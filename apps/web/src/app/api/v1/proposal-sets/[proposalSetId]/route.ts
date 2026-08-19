import { getProposalSet } from "@dajeong/api-client";
import type { NextRequest } from "next/server";

import {
  noStoreFetch,
  sessionJsonResponse,
} from "../../trips/_shared/itinerary-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proposalSetId: string }> },
) {
  const { proposalSetId } = await params;
  return sessionJsonResponse(
    request,
    (baseUrl, accessToken) =>
      getProposalSet({
        accessToken,
        baseUrl,
        fetch: noStoreFetch,
        proposalSetId,
      }),
    "재조정 후보 API에 연결하지 못했습니다.",
  );
}
