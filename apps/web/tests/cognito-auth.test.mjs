import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthorizationUrl,
  callbackUrl,
  exchangeAuthorizationCode,
  matchesLoginState,
  normalizeReturnTo,
  readCognitoConfig,
  refreshAccessToken,
} from "../src/auth/cognito.ts";

const environment = {
  DAJEONG_API_AUDIENCE: "http://localhost:8080/api",
  DAJEONG_COGNITO_CLIENT_ID: "dajeong-web-local",
  DAJEONG_COGNITO_DOMAIN: "http://127.0.0.1:9090/",
  DAJEONG_WEB_BASE_URL: "http://localhost:3000/",
};

test("Cognito authorize URL에 code, PKCE, state, resource audience를 포함한다", () => {
  const config = readCognitoConfig(environment);
  const url = buildAuthorizationUrl(config, "state-value", "challenge-value");

  assert.equal(url.origin, "http://127.0.0.1:9090");
  assert.equal(url.pathname, "/oauth2/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("resource"), "http://localhost:8080/api");
  assert.equal(url.searchParams.get("redirect_uri"), callbackUrl(config));
});

test("state는 일정 시간 비교로 같은 값만 허용한다", () => {
  assert.equal(matchesLoginState("expected", "expected"), true);
  assert.equal(matchesLoginState("modified", "expected"), false);
  assert.equal(matchesLoginState("short", "much-longer"), false);
});

test("로그인 복귀 경로는 같은 웹의 상대 경로만 허용한다", () => {
  assert.equal(
    normalizeReturnTo("/invites/code?from=login"),
    "/invites/code?from=login",
  );
  assert.equal(normalizeReturnTo("https://evil.example/steal"), "/me");
  assert.equal(normalizeReturnTo("//evil.example/steal"), "/me");
  assert.equal(normalizeReturnTo("/%5C%5Cevil.example/steal"), "/me");
  assert.equal(normalizeReturnTo("/%E0%A4%A"), "/me");
});

test("authorization code와 verifier를 token endpoint에 교환한다", async () => {
  const calls = [];
  const tokens = await exchangeAuthorizationCode(
    readCognitoConfig(environment),
    "authorization-code",
    "pkce-verifier",
    async (url, init) => {
      calls.push({ init, url: url.toString() });
      return Response.json({
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "refresh-token",
        token_type: "Bearer",
      });
    },
  );

  assert.deepEqual(tokens, {
    accessToken: "access-token",
    expiresIn: 3600,
    refreshToken: "refresh-token",
  });
  assert.equal(calls[0].url, "http://127.0.0.1:9090/oauth2/token");
  assert.equal(calls[0].init.body.get("grant_type"), "authorization_code");
  assert.equal(calls[0].init.body.get("code_verifier"), "pkce-verifier");
});

test("refresh 응답의 기존 refresh token 생략을 허용한다", async () => {
  const tokens = await refreshAccessToken(
    readCognitoConfig(environment),
    "refresh-token",
    async () =>
      Response.json({
        access_token: "new-access-token",
        expires_in: 1800,
        token_type: "Bearer",
      }),
  );

  assert.deepEqual(tokens, {
    accessToken: "new-access-token",
    expiresIn: 1800,
  });
});

test("필수 인증 설정이 빠지면 변수명을 포함해 실패한다", () => {
  assert.throws(
    () => readCognitoConfig({}),
    /DAJEONG_API_AUDIENCE이\(가\) 필요합니다/,
  );
});
