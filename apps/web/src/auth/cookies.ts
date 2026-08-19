import type { NextResponse } from "next/server";

import type { CognitoConfig, CognitoTokenSet } from "./cognito";

export const authCookieNames = {
  accessToken: "dajeong_access_token",
  loginReturnTo: "dajeong_login_return_to",
  loginState: "dajeong_login_state",
  pkceVerifier: "dajeong_pkce_verifier",
  refreshToken: "dajeong_refresh_token",
} as const;

const LOGIN_ATTEMPT_MAX_AGE_SECONDS = 10 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function setLoginAttemptCookies(
  response: NextResponse,
  config: CognitoConfig,
  attempt: { state: string; verifier: string },
  returnTo: string,
) {
  const options = {
    httpOnly: true,
    maxAge: LOGIN_ATTEMPT_MAX_AGE_SECONDS,
    path: "/api/auth/callback/cognito",
    sameSite: "lax" as const,
    secure: usesSecureCookies(config),
  };
  response.cookies.set(authCookieNames.loginState, attempt.state, options);
  response.cookies.set(authCookieNames.pkceVerifier, attempt.verifier, options);
  response.cookies.set(authCookieNames.loginReturnTo, returnTo, options);
}

export function clearLoginAttemptCookies(
  response: NextResponse,
  config: CognitoConfig,
) {
  const options = {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/callback/cognito",
    sameSite: "lax" as const,
    secure: usesSecureCookies(config),
  };
  response.cookies.set(authCookieNames.loginState, "", options);
  response.cookies.set(authCookieNames.pkceVerifier, "", options);
  response.cookies.set(authCookieNames.loginReturnTo, "", options);
}

export function setSessionCookies(
  response: NextResponse,
  config: CognitoConfig,
  tokens: CognitoTokenSet,
  fallbackRefreshToken?: string,
) {
  const options = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: usesSecureCookies(config),
  };
  response.cookies.set(authCookieNames.accessToken, tokens.accessToken, {
    ...options,
    maxAge: tokens.expiresIn,
  });

  const refreshToken = tokens.refreshToken ?? fallbackRefreshToken;
  if (refreshToken) {
    response.cookies.set(authCookieNames.refreshToken, refreshToken, {
      ...options,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }
}

export function clearSessionCookies(
  response: NextResponse,
  config: CognitoConfig,
) {
  const options = {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax" as const,
    secure: usesSecureCookies(config),
  };
  response.cookies.set(authCookieNames.accessToken, "", options);
  response.cookies.set(authCookieNames.refreshToken, "", options);
}

function usesSecureCookies(config: CognitoConfig): boolean {
  return new URL(config.webBaseUrl).protocol === "https:";
}
