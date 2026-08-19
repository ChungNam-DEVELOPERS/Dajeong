import { ApiClientError, getSystemHealth } from "@dajeong/api-client";

const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

export async function GET() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return Response.json(
      { message: "웹 API base URL이 구성되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const health = await getSystemHealth({
      baseUrl: apiBaseUrl,
      fetch: noStoreFetch,
    });

    return Response.json(health, {
      headers: { "Cache-Control": "no-store" },
      status: health.status === "UP" ? 200 : 503,
    });
  } catch (error: unknown) {
    const upstreamStatus = error instanceof ApiClientError ? error.status : null;

    return Response.json(
      {
        message: "시스템 health API에 연결하지 못했습니다.",
        upstreamStatus,
      },
      {
        headers: { "Cache-Control": "no-store" },
        status: 502,
      },
    );
  }
}
