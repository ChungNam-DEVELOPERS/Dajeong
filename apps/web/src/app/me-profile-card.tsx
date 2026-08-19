"use client";

import {
  ApiClientError,
  deleteCurrentUser,
  getCurrentUser,
} from "@dajeong/api-client";
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
          href="/api/auth/login?returnTo=%2Fme"
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

  if (state.phase === "deleted") {
    return (
      <ProfileShell title="계정 삭제가 완료됐어요">
        <p className="mt-3 leading-7 text-muted">
          개인 식별정보와 활성 여행 관계를 정리하고 이 브라우저의 로그인
          정보도 삭제했습니다.
        </p>
        <Link
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href="/"
        >
          홈으로 돌아가기
        </Link>
      </ProfileShell>
    );
  }

  async function handleAccountDeletion() {
    dispatch({ type: "requestDeletion" });
    try {
      await deleteCurrentUser({ baseUrl: window.location.origin });
      dispatch({ type: "deletionSucceeded" });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        dispatch({ type: "unauthenticated" });
        return;
      }
      dispatch({
        message: readApiMessage(
          error,
          "계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
        type: "deletionFailed",
      });
    }
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
      <section className="mt-8 border-t border-line pt-6" aria-labelledby="account-deletion-title">
        <h2 className="text-lg font-black" id="account-deletion-title">
          계정 삭제
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          개인 식별정보를 익명화하고 참여 중인 여행에서 나갑니다. 내가 방장인
          진행 여행은 보관되며 되돌릴 수 없습니다.
        </p>

        {state.deletion.phase === "idle" ? (
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-white px-5 py-2.5 font-extrabold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            onClick={() => dispatch({ type: "beginDeletion" })}
            type="button"
          >
            계정 삭제 시작
          </button>
        ) : (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-extrabold text-red-800">
              정말 계정을 삭제할까요?
            </p>
            <p className="mt-1 text-sm leading-6 text-red-700">
              삭제 즉시 로그아웃되며 현재 데이터로 복구할 수 없습니다.
            </p>
            {state.deletion.phase === "error" ? (
              <p className="mt-3 text-sm font-bold text-red-800" role="alert">
                {state.deletion.message}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                className="min-h-11 rounded-xl border border-line bg-white px-4 font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                disabled={state.deletion.phase === "deleting"}
                onClick={() => dispatch({ type: "cancelDeletion" })}
                type="button"
              >
                취소
              </button>
              <button
                className="min-h-11 rounded-xl bg-red-700 px-4 font-extrabold text-white transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
                disabled={state.deletion.phase === "deleting"}
                onClick={() => void handleAccountDeletion()}
                type="button"
              >
                {state.deletion.phase === "deleting"
                  ? "삭제하는 중…"
                  : "계정 영구 삭제"}
              </button>
            </div>
          </div>
        )}
      </section>
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
