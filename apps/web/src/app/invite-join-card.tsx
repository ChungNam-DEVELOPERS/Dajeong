"use client";

import { ApiClientError, joinTripByInvite } from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";

import {
  initialInviteJoinState,
  inviteJoinStateReducer,
} from "./invite-state";

export function InviteJoinCard({ code }: Readonly<{ code: string }>) {
  const [state, dispatch] = useReducer(
    inviteJoinStateReducer,
    initialInviteJoinState,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void joinTripByInvite({
      baseUrl: window.location.origin,
      code,
      signal: controller.signal,
    })
      .then((trip) => dispatch({ trip, type: "resolve" }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiClientError) {
          if (error.status === 401) {
            dispatch({ type: "unauthenticated" });
            return;
          }
          if (error.status === 409) {
            dispatch({ type: "full" });
            return;
          }
          if (error.status === 410) {
            dispatch({ type: "gone" });
            return;
          }
        }
        dispatch({
          message: readApiMessage(
            error,
            "초대 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          ),
          type: "reject",
        });
      });

    return () => controller.abort();
  }, [attempt, code]);

  const returnTo = `/invites/${encodeURIComponent(code)}`;
  const loginUrl = `/api/auth/login?${new URLSearchParams({ returnTo })}`;

  if (state.phase === "joining") {
    return (
      <InviteNotice ariaBusy title="초대장을 확인하고 있어요">
        로그인 상태와 여행 참여 가능 여부를 안전하게 확인 중입니다.
      </InviteNotice>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <InviteNotice title="로그인하면 바로 참여할 수 있어요">
        로그인 후 이 초대장으로 자동으로 돌아와 여행 가입을 이어갑니다.
        <a className={primaryActionClassName} href={loginUrl}>
          소셜 로그인하고 참여하기
        </a>
      </InviteNotice>
    );
  }

  if (state.phase === "gone") {
    return (
      <InviteNotice title="사용할 수 없는 초대장이에요">
        초대 링크가 만료됐거나 방장이 새 링크를 발급했습니다. 방장에게 최신
        링크를 요청해 주세요.
        <Link className={secondaryActionClassName} href="/trips">
          내 여행으로 이동
        </Link>
      </InviteNotice>
    );
  }

  if (state.phase === "full") {
    return (
      <InviteNotice title="여행 인원이 모두 찼어요">
        이 여행은 최대 6명이 참여하고 있습니다. 방장에게 참여 가능 여부를
        확인해 주세요.
        <Link className={secondaryActionClassName} href="/trips">
          내 여행으로 이동
        </Link>
      </InviteNotice>
    );
  }

  if (state.phase === "error") {
    return (
      <InviteNotice title="초대장을 확인하지 못했어요">
        {state.message}
        <button
          className={secondaryActionClassName}
          onClick={() => {
            dispatch({ type: "request" });
            setAttempt((current) => current + 1);
          }}
          type="button"
        >
          다시 시도
        </button>
      </InviteNotice>
    );
  }

  return (
    <InviteNotice title="여행에 참여했어요">
      <strong className="mt-2 text-xl text-ink">{state.trip.title}</strong>
      <span className="mt-1">이제 내 여행 목록에서 함께 준비할 수 있어요.</span>
      <Link className={primaryActionClassName} href="/trips">
        내 여행 확인하기
      </Link>
    </InviteNotice>
  );
}

function InviteNotice({
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
      className="flex w-full max-w-xl flex-col rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl"
    >
      <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
        Trip invitation
      </p>
      <h1 className="mt-3 text-[clamp(2rem,7vw,3.25rem)] leading-tight font-black tracking-[-0.045em]">
        {title}
      </h1>
      <div className="mt-4 flex flex-col leading-7 text-muted">{children}</div>
    </section>
  );
}

function readApiMessage(error: unknown, fallback: string): string {
  if (
    error instanceof ApiClientError &&
    typeof error.responseBody === "object" &&
    error.responseBody !== null &&
    "message" in error.responseBody &&
    typeof error.responseBody.message === "string"
  ) {
    return error.responseBody.message;
  }
  return fallback;
}

const primaryActionClassName =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const secondaryActionClassName =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold text-ink transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
