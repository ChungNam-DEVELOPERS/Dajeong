import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildLogoutUrl,
  readCognitoConfig,
  revokeRefreshToken,
} from "../../../../auth/cognito";
import {
  authCookieNames,
  clearSessionCookies,
} from "../../../../auth/cookies";

export async function POST(request: NextRequest) {
  try {
    const config = readCognitoConfig();
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== new URL(config.webBaseUrl).origin) {
      return Response.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const refreshToken = request.cookies.get(authCookieNames.refreshToken)?.value;
    if (refreshToken) {
      await revokeRefreshToken(config, refreshToken).catch(() => undefined);
    }

    const response = NextResponse.redirect(buildLogoutUrl(config), 303);
    clearSessionCookies(response, config);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json(
      { message: "로그아웃 설정을 준비하지 못했습니다." },
      { headers: { "Cache-Control": "no-store" }, status: 500 },
    );
  }
}
