"use client";

import { ApiClientError, getCurrentUser } from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";

import { initialMeState, meStateReducer } from "./me-state";

const joinedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
});

export function MeProfileCard() {
  const [state, dispatch] = useReducer(meStateReducer, initialMeState);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getCurrentUser({
      baseUrl: window.location.origin,
      signal: controller.signal,
    })
      .then((user) => dispatch({ type: "resolve", user }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiClientError && error.status === 401) {
          dispatch({ type: "unauthenticated" });
          return;
        }
        dispatch({
          message: "내 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          type: "reject",
        });
      });

    return () => controller.abort();
  }, [requestKey]);

  if (state.phase === "loading") {
    return (
      <ProfileShell ariaBusy title="내 여행 공간을 준비하고 있어요">
        <p className="mt-3 text-muted">로그인 정보를 안전하게 확인 중입니다.</p>
      </ProfileShell>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <ProfileShell title="로그인이 필요해요">
        <p className="mt-3 leading-7 text-muted">
          로그인하면 여행을 만들고 함께할 사람을 초대할 수 있어요.
        </p>
        <a
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href="/api/auth/login"
        >
          소셜 로그인 시작하기
        </a>
      </ProfileShell>
    );
  }

  if (state.phase === "error") {
    return (
      <ProfileShell title="내 정보를 불러오지 못했어요">
        <p className="mt-3 leading-7 text-muted">{state.message}</p>
        <button
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 py-3 font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={() => {
            dispatch({ type: "request" });
            setRequestKey((current) => current + 1);
          }}
          type="button"
        >
          다시 시도
        </button>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell title={`${state.user.displayName}님, 반가워요`}>
      <p className="mt-3 leading-7 text-muted">
        다정에서 첫 여행을 시작할 준비가 됐어요.
      </p>
      <dl className="mt-8 grid gap-3 sm:grid-cols-2">
        <ProfileMetric label="계정 상태" value="활성" />
        <ProfileMetric
          label="함께한 날"
          value={joinedDateFormatter.format(new Date(state.user.createdAt))}
        />
      </dl>
      <Link
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        href="/trips"
      >
        내 여행으로 가기
      </Link>
      <form action="/api/auth/logout" className="mt-3" method="post">
        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 py-3 font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          type="submit"
        >
          로그아웃
        </button>
      </form>
    </ProfileShell>
  );
}

function ProfileShell({
  ariaBusy = false,
  children,
  title,
}: Readonly<{
  ariaBusy?: boolean;
  children: React.ReactNode;
  title: string;
}>) {
  return (
    <section
      aria-busy={ariaBusy}
      aria-live="polite"
      className="w-full max-w-xl rounded-3xl border border-line bg-panel p-[clamp(var(--space-lg),5vw,var(--space-xxl))] shadow-xl"
    >
      <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
        My Dajeong
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">
        {title}
      </h1>
      {children}
    </section>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-soft p-4">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 font-extrabold">{value}</dd>
    </div>
  );
}
