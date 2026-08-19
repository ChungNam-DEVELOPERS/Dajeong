import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  apiSessionErrorResponse,
  applyRefreshedSession,
  requestWithApiSession,
} from "../../../../../auth/api-session";

export const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

export async function sessionJsonResponse<T>(
  request: NextRequest,
  operation: (baseUrl: string, accessToken: string) => Promise<T>,
  upstreamMessage: string,
) {
  try {
    const session = await requestWithApiSession(request, operation);
    const response = NextResponse.json(session.data, {
      headers: { "Cache-Control": "no-store" },
      status: 200,
    });
    applyRefreshedSession(response, session);
    return response;
  } catch (error: unknown) {
    return apiSessionErrorResponse(error, upstreamMessage);
  }
}

export function readRevision(request: NextRequest): number | null {
  let value = request.headers.get("If-Match")?.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith("W/")) {
    value = value.slice(2).trim();
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json(
    { message },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}
