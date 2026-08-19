"use client";

import {
  ApiClientError,
  getItineraryTimeline,
  type ItineraryTimelineResponse,
} from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  appendItineraryTimeline,
  itineraryTimelineMessage,
} from "./itinerary-state";

type TimelineState =
  | { phase: "loading" }
  | { message: string; phase: "error" }
  | { response: ItineraryTimelineResponse; phase: "ready" };

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function ItineraryTimelinePanel({
  refreshKey,
  tripId,
}: Readonly<{ refreshKey?: string; tripId: string }>) {
  const [state, setState] = useState<TimelineState>({ phase: "loading" });
  const [requestKey, setRequestKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getItineraryTimeline({
      baseUrl: window.location.origin,
      limit: 10,
      signal: controller.signal,
      tripId,
    })
      .then((response) => setState({ phase: "ready", response }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            message: readApiMessage(
              error,
              "일정 변경 타임라인을 불러오지 못했습니다.",
            ),
            phase: "error",
          });
        }
      });
    return () => controller.abort();
  }, [refreshKey, requestKey, tripId]);

  async function loadMore() {
    if (state.phase !== "ready" || !state.response.nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const next = await getItineraryTimeline({
        baseUrl: window.location.origin,
        cursor: state.response.nextCursor,
        limit: 10,
        tripId,
      });
      setState({
        phase: "ready",
        response: appendItineraryTimeline(state.response, next),
      });
    } catch (error: unknown) {
      setPaginationError(
        readApiMessage(error, "이전 일정 변경을 불러오지 못했습니다."),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section aria-labelledby="itinerary-timeline-title" className="rounded-3xl border border-line bg-white/80 p-[clamp(1.25rem,4vw,2.25rem)] shadow-lg backdrop-blur-sm">
      <div>
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">Change history</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]" id="itinerary-timeline-title">일정 변경 타임라인</h2>
        <p className="mt-2 leading-7 text-muted">민감한 선호나 개인별 투표는 숨기고, 변경 행위·시각·버전만 남깁니다.</p>
      </div>

      {state.phase === "loading" ? (
        <p aria-live="polite" className="mt-7 rounded-2xl bg-soft p-5 font-bold text-muted">변경 이력을 확인 중입니다…</p>
      ) : state.phase === "error" ? (
        <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-800">{state.message}</p>
          <button className="mt-4 rounded-xl border border-line bg-white px-4 py-2 text-sm font-extrabold" onClick={() => {
            setState({ phase: "loading" });
            setRequestKey((current) => current + 1);
          }} type="button">다시 시도</button>
        </div>
      ) : state.response.items.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-line bg-soft p-8 text-center">
          <p className="font-black">아직 발행된 일정이 없어요.</p>
          <p className="mt-2 text-sm text-muted">첫 일정을 발행하면 이력이 시작됩니다.</p>
        </div>
      ) : (
        <>
          <ol className="mt-7 grid gap-4">
            {state.response.items.map((item) => (
              <li className="relative pl-8 before:absolute before:top-3 before:bottom-[-1.25rem] before:left-[0.42rem] before:w-px before:bg-line last:before:hidden" key={item.itineraryVersionId}>
                <span aria-hidden="true" className={`absolute top-2 left-0 size-3.5 rounded-full ring-4 ring-white ${item.reason === "REPLAN" ? "bg-brand" : "bg-[#d6973f]"}`} />
                <article className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${item.reason === "REPLAN" ? "bg-[#e7f3e4] text-brand-strong" : "bg-[#fff2cb] text-[#7a4b0f]"}`}>{item.reason === "REPLAN" ? "그룹 투표로 변경" : "원본 일정 발행"}</span>
                    <span className="text-sm font-black text-muted">버전 {item.versionNumber}</span>
                  </div>
                  <p className="mt-4 text-lg font-black">{item.winnerTitle ?? `일정 v${item.versionNumber}`}</p>
                  <p className="mt-2 leading-7 text-muted">{itineraryTimelineMessage(item)}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-muted">
                    <time dateTime={item.occurredAt}>{dateTimeFormatter.format(new Date(item.occurredAt))}</time>
                    {item.proposalSetId ? (
                      <Link className="font-black text-brand-strong underline underline-offset-4" href={`/trips/${encodeURIComponent(tripId)}/disruptions#proposal-set-${encodeURIComponent(item.proposalSetId)}`}>확정 후보 보기</Link>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ol>
          {state.response.nextCursor ? (
            <button className="mt-6 min-h-12 w-full rounded-xl border border-line bg-white px-5 py-3 font-extrabold hover:bg-soft disabled:opacity-60" disabled={loadingMore} onClick={() => void loadMore()} type="button">{loadingMore ? "불러오는 중…" : "이전 변경 더 보기"}</button>
          ) : null}
          {paginationError ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-700">{paginationError}</p> : null}
        </>
      )}
    </section>
  );
}

function readApiMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError && typeof error.responseBody === "object" && error.responseBody !== null && "message" in error.responseBody && typeof error.responseBody.message === "string"
    ? error.responseBody.message
    : fallback;
}
