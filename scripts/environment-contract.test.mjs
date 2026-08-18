import assert from "node:assert/strict";
import test from "node:test";

import { parseDotenv, validateEnvironment } from "./check-env.mjs";
import { scanContent } from "./check-secrets.mjs";

test("dotenv 예제 값을 파싱한다", () => {
  assert.deepEqual(
    parseDotenv(`
# comment
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
QUOTED="value"
    `),
    {
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080",
      QUOTED: "value",
    },
  );
});

test("웹 API URL 누락을 변수명과 함께 거부한다", () => {
  assert.throws(
    () => validateEnvironment("web", "local", {}),
    /NEXT_PUBLIC_API_BASE_URL이\(가\) 필요합니다/,
  );
});

test("배포 환경의 공개 URL은 https만 허용한다", () => {
  assert.throws(
    () =>
      validateEnvironment("mobile", "staging", {
        EXPO_PUBLIC_API_BASE_URL: "http://staging.example.com",
      }),
    /https URL이어야 합니다/,
  );
});

test("공개 접두사가 붙은 비밀 변수명을 거부한다", () => {
  assert.throws(
    () =>
      validateEnvironment("web", "local", {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080",
        ["NEXT_PUBLIC_" + "API_TOKEN"]: "not-allowed",
      }),
    /공개 번들 접두사로 비밀값을 노출할 수 없습니다/,
  );
});

test("API 로컬 환경은 명시된 안전한 기본값을 사용한다", () => {
  assert.deepEqual(validateEnvironment("api", "local", {}), {
    DAJEONG_DB_HOST: "localhost",
    DAJEONG_DB_PORT: "5432",
    DAJEONG_DB_NAME: "dajeong",
    DAJEONG_DB_USER: "dajeong",
    DAJEONG_DB_PASSWORD: "dajeong-local-only",
  });
});

test("API 배포 환경은 누락 변수와 로컬 비밀번호를 거부한다", () => {
  assert.throws(
    () => validateEnvironment("api", "production", {}),
    /DAJEONG_DB_HOST이\(가\) 필요합니다/,
  );
  assert.throws(
    () =>
      validateEnvironment("api", "production", {
        DAJEONG_DB_HOST: "database.internal",
        DAJEONG_DB_PORT: "5432",
        DAJEONG_DB_NAME: "dajeong",
        DAJEONG_DB_USER: "dajeong",
        DAJEONG_DB_PASSWORD: "dajeong-local-only",
      }),
    /로컬 전용 예제값을 사용할 수 없습니다/,
  );
});

test("secret 검사는 참조와 로컬 예제는 허용하고 실제 값 후보는 찾는다", () => {
  assert.deepEqual(
    scanContent(".env.example", "DAJEONG_DB_PASSWORD=dajeong-local-only"),
    [],
  );
  assert.deepEqual(
    scanContent("ci.yml", "TOKEN=${{ secrets.RELEASE_TOKEN }}"),
    [],
  );
  assert.deepEqual(
    scanContent("config.env", "KAKAO_OIDC_CLIENT_SECRET=real-looking-value"),
    ["hard-coded value for KAKAO_OIDC_CLIENT_SECRET"],
  );
  assert.deepEqual(
    scanContent("config.txt", `AWS_ACCESS_KEY_ID=${"AKIA" + "IOSFODNN7EXAMPLE"}`),
    ["AWS access key"],
  );
});
