"use client";

import {
  ApiClientError,
  createTrip,
  listTrips,
  type CreateTripRequest,
  type TripSummaryResponse,
} from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  initialTripState,
  tripStateReducer,
  validateTripDraft,
  type TripDraft,
  type TripDraftErrors,
} from "./trip-state";
import { TripInviteControl } from "./trip-invite-control";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

const emptyDraft: TripDraft = {
  endDate: "",
  startDate: "",
  title: "",
};

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { message: string; phase: "success" | "error" };

interface RetryRequest {
  idempotencyKey: string;
  signature: string;
}

export function TripsWorkspace() {
  const [state, dispatch] = useReducer(tripStateReducer, initialTripState);
  const [requestKey, setRequestKey] = useState(0);
  const [draft, setDraft] = useState<TripDraft>(emptyDraft);
  const [draftErrors, setDraftErrors] = useState<TripDraftErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: "idle" });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const retryRequest = useRef<RetryRequest | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void listTrips({
      baseUrl: window.location.origin,
      limit: 12,
      signal: controller.signal,
    })
      .then((response) => {
        dispatch({
          items: response.items,
          nextCursor: response.nextCursor,
          type: "resolve",
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        handleAuthenticationError(error, dispatch);
      });

    return () => controller.abort();
  }, [requestKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateTripDraft(draft);
    setDraftErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitState({
        message: "입력한 여행 정보를 다시 확인해 주세요.",
        phase: "error",
      });
      return;
    }

    const request: CreateTripRequest = {
      endDate: draft.endDate,
      startDate: draft.startDate,
      title: draft.title.trim(),
    };
    const signature = JSON.stringify(request);
    if (retryRequest.current?.signature !== signature) {
      retryRequest.current = {
        idempotencyKey: globalThis.crypto.randomUUID(),
        signature,
      };
    }

    setSubmitState({ phase: "submitting" });
    try {
      const trip = await createTrip({
        baseUrl: window.location.origin,
        idempotencyKey: retryRequest.current.idempotencyKey,
        request,
      });
      dispatch({ trip, type: "created" });
      retryRequest.current = null;
      setDraft(emptyDraft);
      setDraftErrors({});
      setSubmitState({
        message: `‘${trip.title}’ 여행을 만들었습니다.`,
        phase: "success",
      });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        dispatch({ type: "unauthenticated" });
        return;
      }
      setSubmitState({
        message: readApiMessage(
          error,
          "여행을 만들지 못했습니다. 같은 내용으로 다시 시도해 주세요.",
        ),
        phase: "error",
      });
    }
  }

  async function loadNextPage() {
    if (
      state.phase !== "ready" ||
      !state.nextCursor ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);
    setPaginationError(null);
    try {
      const response = await listTrips({
        baseUrl: window.location.origin,
        cursor: state.nextCursor,
        limit: 12,
      });
      dispatch({
        items: response.items,
        nextCursor: response.nextCursor,
        type: "append",
      });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        dispatch({ type: "unauthenticated" });
        return;
      }
      setPaginationError(
        readApiMessage(
          error,
          "다음 여행을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (state.phase === "loading") {
    return (
      <WorkspaceNotice ariaBusy title="내 여행을 불러오고 있어요">
        로그인 정보와 여행 목록을 안전하게 확인 중입니다.
      </WorkspaceNotice>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <WorkspaceNotice title="로그인하고 여행을 시작해 보세요">
        여행을 만들고 내 여행 목록을 보려면 로그인이 필요합니다.
        <a
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href="/api/auth/login?returnTo=%2Ftrips"
        >
          소셜 로그인 시작하기
        </a>
      </WorkspaceNotice>
    );
  }

  if (state.phase === "error") {
    return (
      <WorkspaceNotice title="여행 목록을 불러오지 못했어요">
        {state.message}
        <button
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={() => {
            dispatch({ type: "request" });
            setRequestKey((current) => current + 1);
          }}
          type="button"
        >
          다시 시도
        </button>
      </WorkspaceNotice>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
      <section className="rounded-3xl border border-line bg-panel p-[clamp(1.25rem,4vw,2rem)] shadow-lg lg:sticky lg:top-8">
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
          New trip
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
          새 여행 만들기
        </h2>
        <p className="mt-2 leading-7 text-muted">
          첫 버전에서는 대전 여행부터 차근차근 준비할 수 있어요.
        </p>

        <form className="mt-7 grid gap-5" noValidate onSubmit={handleSubmit}>
          <Field label="여행 이름" error={draftErrors.title} htmlFor="trip-title">
            <input
              aria-describedby={draftErrors.title ? "trip-title-error" : undefined}
              aria-invalid={Boolean(draftErrors.title)}
              className={inputClassName}
              id="trip-title"
              maxLength={100}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }));
                setDraftErrors((current) => ({ ...current, title: undefined }));
              }}
              placeholder="예: 대전 여름 여행"
              type="text"
              value={draft.title}
            />
          </Field>

          <Field label="지역" htmlFor="trip-region">
            <input
              className={`${inputClassName} cursor-not-allowed bg-soft text-muted`}
              disabled
              id="trip-region"
              type="text"
              value="대전"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field
              label="출발일"
              error={draftErrors.startDate}
              htmlFor="trip-start-date"
            >
              <input
                aria-describedby={
                  draftErrors.startDate ? "trip-start-date-error" : undefined
                }
                aria-invalid={Boolean(draftErrors.startDate)}
                className={inputClassName}
                id="trip-start-date"
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }));
                  setDraftErrors((current) => ({
                    ...current,
                    startDate: undefined,
                  }));
                }}
                type="date"
                value={draft.startDate}
              />
            </Field>
            <Field
              label="도착일"
              error={draftErrors.endDate}
              htmlFor="trip-end-date"
            >
              <input
                aria-describedby={
                  draftErrors.endDate ? "trip-end-date-error" : undefined
                }
                aria-invalid={Boolean(draftErrors.endDate)}
                className={inputClassName}
                id="trip-end-date"
                min={draft.startDate || undefined}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }));
                  setDraftErrors((current) => ({
                    ...current,
                    endDate: undefined,
                  }));
                }}
                type="date"
                value={draft.endDate}
              />
            </Field>
          </div>

          <button
            className="mt-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
            disabled={submitState.phase === "submitting"}
            type="submit"
          >
            {submitState.phase === "submitting" ? "만드는 중…" : "여행 만들기"}
          </button>
          {submitState.phase === "success" || submitState.phase === "error" ? (
            <p
              aria-live="polite"
              className={
                submitState.phase === "success"
                  ? "text-sm font-bold text-brand-strong"
                  : "text-sm font-bold text-red-700"
              }
            >
              {submitState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section
        aria-labelledby="trip-list-title"
        className="rounded-3xl border border-line bg-white/75 p-[clamp(1.25rem,4vw,2rem)] shadow-lg backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
              My trips
            </p>
            <h2
              className="mt-2 text-3xl font-black tracking-[-0.04em]"
              id="trip-list-title"
            >
              내 여행
            </h2>
          </div>
          <p className="rounded-full bg-soft px-3 py-1.5 text-sm font-extrabold text-muted">
            {state.items.length}개
          </p>
        </div>

        {state.items.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-line bg-soft px-5 py-12 text-center">
            <p className="text-lg font-extrabold">아직 만든 여행이 없어요</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              왼쪽 양식을 채우면 첫 여행이 이곳에 나타납니다.
            </p>
          </div>
        ) : (
          <ul className="mt-7 grid gap-4">
            {state.items.map((trip) => (
              <li key={trip.id}>
                <TripCard trip={trip} />
              </li>
            ))}
          </ul>
        )}

        {state.nextCursor ? (
          <button
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 py-3 font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
            disabled={isLoadingMore}
            onClick={() => void loadNextPage()}
            type="button"
          >
            {isLoadingMore ? "불러오는 중…" : "여행 더 보기"}
          </button>
        ) : null}
        {paginationError ? (
          <p aria-live="polite" className="mt-3 text-sm font-bold text-red-700">
            {paginationError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  children,
  error,
  htmlFor,
  label,
}: Readonly<{
  children: React.ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}>) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-bold text-red-700" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TripCard({ trip }: Readonly<{ trip: TripSummaryResponse }>) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-brand-strong">
            {trip.region === "DAEJEON" ? "대전" : trip.region}
          </p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.025em]">
            {trip.title}
          </h3>
        </div>
        <span className="rounded-full bg-[#eff8ec] px-3 py-1 text-xs font-extrabold text-brand-strong">
          {statusLabel[trip.status]}
        </span>
      </div>
      <p className="mt-5 font-bold text-muted">
        {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
      </p>
      <p className="mt-2 text-sm font-bold text-muted">
        {trip.role === "HOST" ? "내가 만든 여행" : "함께하는 여행"}
      </p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        href={`/trips/${trip.id}`}
      >
        {trip.role === "HOST" ? "일정 관리" : "일정 보기"}
      </Link>
      {trip.role === "HOST" &&
      (trip.status === "DRAFT" || trip.status === "ACTIVE") ? (
        <TripInviteControl tripId={trip.id} />
      ) : null}
    </article>
  );
}

function WorkspaceNotice({
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
      className="mx-auto flex max-w-xl flex-col rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl"
    >
      <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
        My trips
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">
        {title}
      </h1>
      <div className="mt-3 flex flex-col leading-7 text-muted">{children}</div>
    </section>
  );
}

function handleAuthenticationError(
  error: unknown,
  dispatch: React.Dispatch<Parameters<typeof tripStateReducer>[1]>,
) {
  if (error instanceof ApiClientError && error.status === 401) {
    dispatch({ type: "unauthenticated" });
    return;
  }
  dispatch({
    message: readApiMessage(
      error,
      "여행 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ),
    type: "reject",
  });
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

function formatTripDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00+09:00`));
}

const statusLabel: Record<TripSummaryResponse["status"], string> = {
  ACTIVE: "진행 중",
  ARCHIVED: "보관됨",
  COMPLETED: "완료",
  DRAFT: "준비 중",
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 font-semibold outline-none transition focus:border-brand focus:ring-3 focus:ring-[#5b9f5a22] aria-invalid:border-red-600 aria-invalid:ring-red-100";
