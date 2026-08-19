import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  exchangeAuthorizationCode,
  matchesLoginState,
  normalizeReturnTo,
  readCognitoConfig,
  type CognitoConfig,
} from "../../../../../auth/cognito";
import {
  authCookieNames,
  clearLoginAttemptCookies,
  setSessionCookies,
} from "../../../../../auth/cookies";

export async function GET(request: NextRequest) {
  let config: CognitoConfig;
  try {
    config = readCognitoConfig();
  } catch {
    return Response.json(
      { message: "로그인 설정을 준비하지 못했습니다." },
      { headers: { "Cache-Control": "no-store" }, status: 500 },
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(authCookieNames.loginState)?.value;
  const verifier = request.cookies.get(authCookieNames.pkceVerifier)?.value;
  const returnTo = normalizeReturnTo(
    request.cookies.get(authCookieNames.loginReturnTo)?.value,
  );

  if (
    request.nextUrl.searchParams.has("error") ||
    !code ||
    !state ||
    !expectedState ||
    !verifier ||
    !matchesLoginState(state, expectedState)
  ) {
    return loginError(config, "invalid_callback", returnTo);
  }

  try {
    const tokens = await exchangeAuthorizationCode(config, code, verifier);
    const response = NextResponse.redirect(
      new URL(returnTo, `${config.webBaseUrl}/`),
      303,
    );
    clearLoginAttemptCookies(response, config);
    setSessionCookies(response, config, tokens);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return loginError(config, "token_exchange_failed", returnTo);
  }
}

function loginError(config: CognitoConfig, error: string, returnTo: string) {
  const url = new URL("/login", `${config.webBaseUrl}/`);
  url.searchParams.set("error", error);
  url.searchParams.set("returnTo", normalizeReturnTo(returnTo));
  const response = NextResponse.redirect(url, 303);
  clearLoginAttemptCookies(response, config);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
