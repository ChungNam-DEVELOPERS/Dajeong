import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  createApiClient,
  issueTripInvite,
  joinTripByInvite,
} from "../src/index.ts";

const invite = {
  code: "invite/code with reserved characters",
  expiresAt: "2026-08-26T00:00:00Z",
};

const trip = {
  createdAt: "2026-08-19T00:00:00Z",
  endDate: "2026-08-23",
  id: "3d4f75e0-e976-4917-8ce8-44c36b53a317",
  region: "DAEJEON",
  role: "MEMBER",
  startDate: "2026-08-21",
  status: "DRAFT",
  title: "초대로 참여한 여행",
};

test("방장 초대 발급 요청의 경로와 인증을 보존한다", async () => {
  let call;
  const response = await issueTripInvite({
    accessToken: "host-access-token",
    baseUrl: "https://api.example.com/",
    fetch: async (url, init) => {
      call = { init, url };
      return Response.json(invite, { status: 201 });
    },
    tripId: "trip/id",
  });

  assert.deepEqual(response, invite);
  assert.equal(
    call.url,
    "https://api.example.com/api/v1/trips/trip%2Fid/invites",
  );
  assert.equal(call.init.method, "POST");
  assert.equal(
    call.init.headers.get("Authorization"),
    "Bearer host-access-token",
  );
});

test("초대 가입은 코드를 인코딩하고 200 재가입 응답도 반환한다", async () => {
  let requestedUrl;
  const response = await joinTripByInvite({
    baseUrl: "https://api.example.com",
    code: invite.code,
    fetch: async (url) => {
      requestedUrl = url;
      return Response.json(trip, { status: 200 });
    },
  });

  assert.deepEqual(response, trip);
  assert.equal(
    requestedUrl,
    "https://api.example.com/api/v1/invites/invite%2Fcode%20with%20reserved%20characters/join",
  );
});

test("조합 클라이언트에서도 초대 가입을 호출할 수 있다", async () => {
  let authorization;
  const client = createApiClient({
    baseUrl: "https://api.example.com",
    fetch: async (_url, init) => {
      authorization = init.headers.get("Authorization");
      return Response.json(trip, { status: 201 });
    },
  });

  assert.deepEqual(
    await client.joinTripByInvite("plain-code", {
      accessToken: "member-access-token",
    }),
    trip,
  );
  assert.equal(authorization, "Bearer member-access-token");
});

test("정원 초과 오류 코드와 본문을 보존한다", async () => {
  await assert.rejects(
    joinTripByInvite({
      baseUrl: "https://api.example.com",
      code: "full-trip-code",
      fetch: async () =>
        Response.json(
          { code: "TRIP_FULL", message: "최대 인원에 도달했습니다." },
          { status: 409 },
        ),
    }),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 409);
      assert.deepEqual(error.responseBody, {
        code: "TRIP_FULL",
        message: "최대 인원에 도달했습니다.",
      });
      return true;
    },
  );
});
