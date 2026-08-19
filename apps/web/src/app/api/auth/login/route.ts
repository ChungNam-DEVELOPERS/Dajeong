import { NextResponse } from "next/server";

import {
  buildAuthorizationUrl,
  createLoginAttempt,
  readCognitoConfig,
} from "../../../../auth/cognito";
import { setLoginAttemptCookies } from "../../../../auth/cookies";

export async function GET() {
  try {
    const config = readCognitoConfig();
    const attempt = createLoginAttempt();
    const response = NextResponse.redirect(
      buildAuthorizationUrl(config, attempt.state, attempt.challenge),
    );
    setLoginAttemptCookies(response, config, attempt);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json(
      { message: "로그인 설정을 준비하지 못했습니다." },
      { headers: { "Cache-Control": "no-store" }, status: 500 },
    );
  }
}
