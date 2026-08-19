"use client";

import { getSystemHealth } from "@dajeong/api-client";
import { useEffect, useReducer, useState } from "react";
import {
  healthStateReducer,
  initialHealthState,
  type HealthViewState,
} from "./health-state";

const healthCopy: Record<
  HealthViewState["phase"],
  { badge: string; description: string; title: string }
> = {
  loading: {
    badge: "확인 중",
    description: "웹과 API 사이 연결 상태를 확인하고 있어요.",
    title: "API 상태를 불러오는 중이에요",
  },
  up: {
    badge: "연결됨",
    description: "웹이 시스템 health 응답을 정상적으로 받았습니다.",
    title: "API가 정상이에요",
  },
  down: {
    badge: "점검 필요",
    description: "API는 응답했지만 데이터베이스 연결을 확인해야 해요.",
    title: "API가 아직 준비되지 않았어요",
  },
  error: {
    badge: "연결 실패",
    description: "로컬 API가 실행 중인지 확인한 뒤 다시 시도해 주세요.",
    title: "API에 연결하지 못했어요",
  },
};

const statusTone: Record<HealthViewState["phase"], string> = {
  loading: "bg-[#e2a93b] shadow-[0_0_0_5px_rgb(226_169_59_/_16%)]",
  up: "bg-brand shadow-[0_0_0_5px_rgb(91_159_90_/_16%)]",
  down: "bg-[#d97706] shadow-[0_0_0_5px_rgb(217_119_6_/_14%)]",
  error: "bg-[#c2413b] shadow-[0_0_0_5px_rgb(194_65_59_/_14%)]",
};

export function SystemHealthCard() {
  const [state, dispatch] = useReducer(healthStateReducer, initialHealthState);
  const [requestKey, setRequestKey] = useState(0);
  const copy = healthCopy[state.phase];
  const isLoading = state.phase === "loading";

  useEffect(() => {
    const controller = new AbortController();

    void getSystemHealth({
      baseUrl: window.location.origin,
      signal: controller.signal,
    })
      .then((response) => dispatch({ response, type: "resolve" }))
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        dispatch({
          message: "웹에서 시스템 health 응답을 가져오지 못했습니다.",
          type: "reject",
        });
      });

    return () => controller.abort();
  }, [requestKey]);

  function retry() {
    dispatch({ type: "request" });
    setRequestKey((current) => current + 1);
  }

  return (
    <aside
      aria-busy={isLoading}
      aria-labelledby="health-title"
      aria-live="polite"
      className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border border-line bg-panel p-[clamp(var(--space-lg),4vw,var(--space-xxl))] shadow-xl lg:max-w-none"
    >
      <div
        className="absolute -top-14 -right-10 size-36 rounded-full bg-highlight opacity-80"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-3">
        <span
          className={`size-3 shrink-0 rounded-full ${statusTone[state.phase]} ${isLoading ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <p className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
          System health · {copy.badge}
        </p>
      </div>

      <h2
        id="health-title"
        className="relative mt-[var(--space-md)] text-[clamp(1.65rem,3vw,2.25rem)] font-extrabold tracking-[-0.035em]"
      >
        {copy.title}
      </h2>
      <p className="relative mt-[var(--space-sm)] leading-7 text-muted">
        {copy.description}
      </p>

      {state.phase === "up" || state.phase === "down" ? (
        <dl className="relative my-[var(--space-xl)] grid grid-cols-2 gap-[var(--space-sm)]">
          <HealthMetric label="API" value={state.response.status} />
          <HealthMetric label="Database" value={state.response.database} />
        </dl>
      ) : (
        <div className="relative my-[var(--space-xl)] rounded-[18px] bg-soft p-[var(--space-md)]">
          <p className="text-xs font-bold text-muted">연결 경로</p>
          <p className="mt-1.5 text-sm font-extrabold">
            /api/v1/system/health
          </p>
          {state.phase === "error" ? (
            <p className="mt-2 text-xs leading-5 text-muted">
              {state.message}
            </p>
          ) : null}
        </div>
      )}

      <button
        className="relative inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
        disabled={isLoading}
        onClick={retry}
        type="button"
      >
        {isLoading ? "상태 확인 중" : "다시 확인"}
      </button>
    </aside>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  const isUp = value === "UP";

  return (
    <div className="rounded-[18px] border border-line bg-white/70 p-[var(--space-md)] backdrop-blur-sm">
      <dt className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-lg font-black ${isUp ? "text-brand-strong" : "text-[#a43b35]"}`}
      >
        {value}
      </dd>
    </div>
  );
}
