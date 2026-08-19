"use client";

import {
  addItineraryDraftSlot,
  ApiClientError,
  deleteItineraryDraftSlot,
  getCurrentItinerary,
  getItineraryDraft,
  getTrip,
  publishItineraryDraft,
  type ItineraryDraftResponse,
  type ItinerarySlotResponse,
  type ItineraryVersionResponse,
  type TripSummaryResponse,
  updateItineraryDraftSlot,
} from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  createEmptySlotDraft,
  initialItineraryState,
  itineraryStateReducer,
  toItinerarySlotRequest,
  validateItinerarySlotDraft,
  type ItineraryCategory,
  type ItinerarySlotDraft,
  type ItinerarySlotDraftErrors,
} from "./itinerary-state";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "short",
  timeZone: "Asia/Seoul",
  weekday: "short",
});
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Seoul",
  year: "numeric",
});
const seoulInputFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Seoul",
  year: "numeric",
});
const wonFormatter = new Intl.NumberFormat("ko-KR");

type MutationState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { message: string; phase: "error" | "success" };

interface RetryRequest {
  idempotencyKey: string;
  signature: string;
}

export function ItineraryWorkspace({ tripId }: Readonly<{ tripId: string }>) {
  const [state, dispatch] = useReducer(
    itineraryStateReducer,
    initialItineraryState,
  );
  const [requestKey, setRequestKey] = useState(0);
  const [slotDraft, setSlotDraft] = useState<ItinerarySlotDraft>(() =>
    createEmptySlotDraft(""),
  );
  const [slotErrors, setSlotErrors] = useState<ItinerarySlotDraftErrors>({});
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotMutation, setSlotMutation] = useState<MutationState>({ phase: "idle" });
  const [publishMutation, setPublishMutation] = useState<MutationState>({
    phase: "idle",
  });
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const slotRetry = useRef<RetryRequest | null>(null);
  const publishRetry = useRef<RetryRequest | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void loadWorkspace(tripId, controller.signal)
      .then(({ current, draft, trip }) => {
        dispatch({ current, draft, trip, type: "resolve" });
        setSlotDraft(createEmptySlotDraft(trip.startDate));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        dispatchWorkspaceError(error, dispatch);
      });

    return () => controller.abort();
  }, [requestKey, tripId]);

  async function submitSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "ready" || !state.draft) {
      return;
    }
    const errors = validateItinerarySlotDraft(slotDraft, state.trip);
    setSlotErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSlotMutation({
        message: "입력한 일정 정보를 다시 확인해 주세요.",
        phase: "error",
      });
      return;
    }

    const request = toItinerarySlotRequest(slotDraft);
    setSlotMutation({ phase: "submitting" });
    try {
      let draft: ItineraryDraftResponse;
      if (editingSlotId) {
        draft = await updateItineraryDraftSlot({
          baseUrl: window.location.origin,
          request,
          revision: state.draft.revision,
          slotId: editingSlotId,
          tripId,
        });
      } else {
        const signature = JSON.stringify(request);
        if (slotRetry.current?.signature !== signature) {
          slotRetry.current = {
            idempotencyKey: globalThis.crypto.randomUUID(),
            signature,
          };
        }
        draft = await addItineraryDraftSlot({
          baseUrl: window.location.origin,
          idempotencyKey: slotRetry.current.idempotencyKey,
          request,
          revision: state.draft.revision,
          tripId,
        });
      }

      dispatch({ draft, type: "draft-updated" });
      slotRetry.current = null;
      setEditingSlotId(null);
      setSlotDraft(createEmptySlotDraft(state.trip.startDate));
      setSlotErrors({});
      setSlotMutation({
        message: editingSlotId
          ? "일정 슬롯을 수정했습니다."
          : "일정 슬롯을 초안에 추가했습니다.",
        phase: "success",
      });
    } catch (error: unknown) {
      handleMutationError(
        error,
        "일정 슬롯을 저장하지 못했습니다. 같은 내용으로 다시 시도해 주세요.",
        setSlotMutation,
      );
    }
  }

  async function deleteSlot(slotId: string) {
    if (state.phase !== "ready" || !state.draft || deletingSlotId) {
      return;
    }
    setDeletingSlotId(slotId);
    setSlotMutation({ phase: "idle" });
    try {
      const draft = await deleteItineraryDraftSlot({
        baseUrl: window.location.origin,
        revision: state.draft.revision,
        slotId,
        tripId,
      });
      dispatch({ draft, type: "draft-updated" });
      setConfirmDeleteId(null);
      if (editingSlotId === slotId) {
        setEditingSlotId(null);
        setSlotDraft(createEmptySlotDraft(state.trip.startDate));
      }
      setSlotMutation({ message: "일정 슬롯을 삭제했습니다.", phase: "success" });
    } catch (error: unknown) {
      handleMutationError(
        error,
        "일정 슬롯을 삭제하지 못했습니다.",
        setSlotMutation,
      );
    } finally {
      setDeletingSlotId(null);
    }
  }

  async function publishDraft() {
    if (state.phase !== "ready" || !state.draft) {
      return;
    }
    const signature = String(state.draft.revision);
    if (publishRetry.current?.signature !== signature) {
      publishRetry.current = {
        idempotencyKey: globalThis.crypto.randomUUID(),
        signature,
      };
    }
    setPublishMutation({ phase: "submitting" });
    try {
      const version = await publishItineraryDraft({
        baseUrl: window.location.origin,
        idempotencyKey: publishRetry.current.idempotencyKey,
        revision: state.draft.revision,
        tripId,
      });
      dispatch({ type: "published", version });
      publishRetry.current = null;
      setPublishMutation({
        message: `일정 버전 ${version.versionNumber}을 모두에게 공개했습니다.`,
        phase: "success",
      });
    } catch (error: unknown) {
      handleMutationError(
        error,
        "일정을 발행하지 못했습니다. 같은 초안으로 다시 시도해 주세요.",
        setPublishMutation,
      );
    }
  }

  function handleMutationError(
    error: unknown,
    fallback: string,
    setMutation: React.Dispatch<React.SetStateAction<MutationState>>,
  ) {
    if (error instanceof ApiClientError && error.status === 401) {
      dispatch({ type: "unauthenticated" });
      return;
    }
    if (readApiCode(error) === "STALE_VERSION") {
      setMutation({
        message: "다른 변경을 확인해 최신 초안을 다시 불러왔습니다. 다시 시도해 주세요.",
        phase: "error",
      });
      dispatch({ type: "request" });
      setRequestKey((current) => current + 1);
      return;
    }
    setMutation({ message: readApiMessage(error, fallback), phase: "error" });
  }

  if (state.phase === "loading") {
    return (
      <WorkspaceNotice ariaBusy title="여행 일정을 불러오고 있어요">
        여행 권한과 최신 일정 버전을 안전하게 확인 중입니다.
      </WorkspaceNotice>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <WorkspaceNotice title="로그인하고 일정을 확인해 보세요">
        이 여행의 일정을 보려면 로그인이 필요합니다.
        <a
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href={`/api/auth/login?returnTo=${encodeURIComponent(`/trips/${tripId}`)}`}
        >
          소셜 로그인 시작하기
        </a>
      </WorkspaceNotice>
    );
  }

  if (state.phase === "forbidden") {
    return (
      <WorkspaceNotice title="이 여행을 볼 수 없어요">
        {state.message}
        <Link className={secondaryLinkClassName} href="/trips">
          내 여행으로 돌아가기
        </Link>
      </WorkspaceNotice>
    );
  }

  if (state.phase === "error") {
    return (
      <WorkspaceNotice title="일정을 불러오지 못했어요">
        {state.message}
        <button
          className={secondaryButtonClassName}
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

  const editable = canEditItinerary(state.trip) && state.draft !== null;
  return (
    <div className="grid gap-7">
      <TripSummary trip={state.trip} />

      {editable && state.draft ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)] lg:items-start">
          <SlotEditor
            draft={slotDraft}
            editing={editingSlotId !== null}
            errors={slotErrors}
            mutation={slotMutation}
            onCancel={() => {
              setEditingSlotId(null);
              setSlotDraft(createEmptySlotDraft(state.trip.startDate));
              setSlotErrors({});
              setSlotMutation({ phase: "idle" });
            }}
            onChange={setSlotDraft}
            onSubmit={submitSlot}
            trip={state.trip}
          />
          <DraftPanel
            confirmDeleteId={confirmDeleteId}
            deletingSlotId={deletingSlotId}
            draft={state.draft}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onConfirmDelete={(slotId) => void deleteSlot(slotId)}
            onEdit={(slot) => {
              setEditingSlotId(slot.id);
              setSlotDraft(slotToDraft(slot));
              setSlotErrors({});
              setSlotMutation({ phase: "idle" });
              window.scrollTo({ behavior: "smooth", top: 0 });
            }}
            onPublish={() => void publishDraft()}
            onRequestDelete={setConfirmDeleteId}
            publishMutation={publishMutation}
          />
        </div>
      ) : state.trip.role === "HOST" ? (
        <section className="rounded-3xl border border-line bg-panel p-6 shadow-lg">
          <h2 className="text-2xl font-black">일정 편집이 종료된 여행입니다</h2>
          <p className="mt-2 leading-7 text-muted">
            완료되거나 보관된 여행의 확정 일정은 볼 수 있지만 초안은 변경할 수
            없습니다.
          </p>
        </section>
      ) : null}

      <PublishedPanel current={state.current} />
    </div>
  );
}

async function loadWorkspace(tripId: string, signal: AbortSignal) {
  const baseUrl = window.location.origin;
  const tripRequest = getTrip({ baseUrl, signal, tripId });
  const currentRequest = getCurrentItinerary({ baseUrl, signal, tripId }).catch(
    (error: unknown) => {
      if (
        error instanceof ApiClientError &&
        error.status === 404 &&
        readApiCode(error) === "ITINERARY_NOT_PUBLISHED"
      ) {
        return null;
      }
      throw error;
    },
  );
  const trip = await tripRequest;
  const draftRequest = canEditItinerary(trip)
    ? getItineraryDraft({ baseUrl, signal, tripId })
    : Promise.resolve(null);
  const [current, draft] = await Promise.all([currentRequest, draftRequest]);
  return { current, draft, trip };
}

function dispatchWorkspaceError(
  error: unknown,
  dispatch: React.Dispatch<Parameters<typeof itineraryStateReducer>[1]>,
) {
  if (error instanceof ApiClientError && error.status === 401) {
    dispatch({ type: "unauthenticated" });
    return;
  }
  if (error instanceof ApiClientError && error.status === 403) {
    dispatch({
      message: readApiMessage(error, "이 여행의 활성 멤버만 일정을 볼 수 있습니다."),
      type: "forbidden",
    });
    return;
  }
  dispatch({
    message: readApiMessage(
      error,
      "일정 API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ),
    type: "reject",
  });
}

function TripSummary({ trip }: Readonly<{ trip: TripSummaryResponse }>) {
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-panel shadow-xl">
      <div className="grid gap-5 bg-[linear-gradient(130deg,#fff7d7_0%,#edf7ea_58%,#fff_100%)] p-[clamp(1.5rem,5vw,3rem)] sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-extrabold tracking-[0.09em] text-brand-strong uppercase">
            Trip itinerary
          </p>
          <h1 className="mt-2 text-[clamp(2rem,7vw,4rem)] leading-none font-black tracking-[-0.055em]">
            {trip.title}
          </h1>
          <p className="mt-4 font-bold text-muted">
            {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)} · 대전
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full bg-white/85 px-3 py-1.5 text-sm font-extrabold text-brand-strong">
            {trip.role === "HOST" ? "방장" : "멤버"}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1.5 text-sm font-extrabold text-muted">
            {statusLabel[trip.status]}
          </span>
        </div>
      </div>
    </section>
  );
}

function SlotEditor({
  draft,
  editing,
  errors,
  mutation,
  onCancel,
  onChange,
  onSubmit,
  trip,
}: Readonly<{
  draft: ItinerarySlotDraft;
  editing: boolean;
  errors: ItinerarySlotDraftErrors;
  mutation: MutationState;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<ItinerarySlotDraft>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  trip: TripSummaryResponse;
}>) {
  function update<Key extends keyof ItinerarySlotDraft>(
    key: Key,
    value: ItinerarySlotDraft[Key],
  ) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="rounded-3xl border border-line bg-panel p-[clamp(1.25rem,4vw,2rem)] shadow-lg lg:sticky lg:top-8">
      <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
        {editing ? "Edit slot" : "Add slot"}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
        {editing ? "일정 수정하기" : "기존 일정 입력"}
      </h2>
      <p className="mt-2 leading-7 text-muted">
        검색 결과가 없어도 장소와 시간을 직접 입력할 수 있어요.
      </p>

      <form className="mt-7 grid gap-5" noValidate onSubmit={onSubmit}>
        <Field error={errors.date} htmlFor="slot-date" label="날짜">
          <input
            aria-describedby={errors.date ? "slot-date-error" : undefined}
            aria-invalid={Boolean(errors.date)}
            className={inputClassName}
            id="slot-date"
            max={trip.endDate}
            min={trip.startDate}
            onChange={(event) => update("date", event.target.value)}
            type="date"
            value={draft.date}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field error={errors.startTime} htmlFor="slot-start" label="시작">
            <input
              aria-describedby={errors.startTime ? "slot-start-error" : undefined}
              aria-invalid={Boolean(errors.startTime)}
              className={inputClassName}
              id="slot-start"
              onChange={(event) => update("startTime", event.target.value)}
              type="time"
              value={draft.startTime}
            />
          </Field>
          <Field error={errors.endTime} htmlFor="slot-end" label="종료">
            <input
              aria-describedby={errors.endTime ? "slot-end-error" : undefined}
              aria-invalid={Boolean(errors.endTime)}
              className={inputClassName}
              id="slot-end"
              onChange={(event) => update("endTime", event.target.value)}
              type="time"
              value={draft.endTime}
            />
          </Field>
        </div>
        <Field error={errors.placeName} htmlFor="slot-place" label="장소 이름">
          <input
            aria-describedby={errors.placeName ? "slot-place-error" : undefined}
            aria-invalid={Boolean(errors.placeName)}
            className={inputClassName}
            id="slot-place"
            maxLength={120}
            onChange={(event) => update("placeName", event.target.value)}
            placeholder="예: 국립중앙과학관"
            type="text"
            value={draft.placeName}
          />
        </Field>
        <Field error={errors.address} htmlFor="slot-address" label="주소">
          <input
            aria-describedby={errors.address ? "slot-address-error" : undefined}
            aria-invalid={Boolean(errors.address)}
            className={inputClassName}
            id="slot-address"
            maxLength={240}
            onChange={(event) => update("address", event.target.value)}
            placeholder="예: 대전 유성구 대덕대로 481"
            type="text"
            value={draft.address}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field htmlFor="slot-category" label="분류">
            <select
              className={inputClassName}
              id="slot-category"
              onChange={(event) =>
                update("category", event.target.value as ItineraryCategory)
              }
              value={draft.category}
            >
              {Object.entries(categoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field error={errors.expectedCost} htmlFor="slot-cost" label="예상 비용">
            <input
              aria-describedby={errors.expectedCost ? "slot-cost-error" : undefined}
              aria-invalid={Boolean(errors.expectedCost)}
              className={inputClassName}
              id="slot-cost"
              max={100_000_000}
              min={0}
              onChange={(event) => update("expectedCost", event.target.value)}
              step={1000}
              type="number"
              value={draft.expectedCost}
            />
          </Field>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 font-extrabold">
          <input
            checked={draft.indoor}
            className="size-5 accent-[var(--color-brand)]"
            onChange={(event) => update("indoor", event.target.checked)}
            type="checkbox"
          />
          실내 일정이에요
        </label>
        <details className="rounded-xl border border-line bg-soft p-4">
          <summary className="cursor-pointer font-extrabold">좌표 직접 입력 (선택)</summary>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field error={errors.latitude} htmlFor="slot-latitude" label="위도">
              <input
                aria-describedby={
                  errors.latitude ? "slot-latitude-error" : undefined
                }
                aria-invalid={Boolean(errors.latitude)}
                className={inputClassName}
                id="slot-latitude"
                onChange={(event) => update("latitude", event.target.value)}
                placeholder="36.3741"
                step="any"
                type="number"
                value={draft.latitude}
              />
            </Field>
            <Field error={errors.longitude} htmlFor="slot-longitude" label="경도">
              <input
                aria-describedby={
                  errors.longitude ? "slot-longitude-error" : undefined
                }
                aria-invalid={Boolean(errors.longitude)}
                className={inputClassName}
                id="slot-longitude"
                onChange={(event) => update("longitude", event.target.value)}
                placeholder="127.3778"
                step="any"
                type="number"
                value={draft.longitude}
              />
            </Field>
          </div>
        </details>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
            disabled={mutation.phase === "submitting"}
            type="submit"
          >
            {mutation.phase === "submitting"
              ? "저장 중…"
              : editing
                ? "수정 저장"
                : "초안에 추가"}
          </button>
          {editing ? (
            <button
              className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-extrabold hover:bg-soft"
              onClick={onCancel}
              type="button"
            >
              취소
            </button>
          ) : null}
        </div>
        {mutation.phase === "error" || mutation.phase === "success" ? (
          <p
            aria-live="polite"
            className={
              mutation.phase === "success"
                ? "text-sm font-bold text-brand-strong"
                : "text-sm font-bold text-red-700"
            }
          >
            {mutation.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function DraftPanel({
  confirmDeleteId,
  deletingSlotId,
  draft,
  onCancelDelete,
  onConfirmDelete,
  onEdit,
  onPublish,
  onRequestDelete,
  publishMutation,
}: Readonly<{
  confirmDeleteId: string | null;
  deletingSlotId: string | null;
  draft: ItineraryDraftResponse;
  onCancelDelete: () => void;
  onConfirmDelete: (slotId: string) => void;
  onEdit: (slot: ItinerarySlotResponse) => void;
  onPublish: () => void;
  onRequestDelete: (slotId: string) => void;
  publishMutation: MutationState;
}>) {
  const unchanged = draft.publishedRevision === draft.revision;
  return (
    <section className="rounded-3xl border border-line bg-white/80 p-[clamp(1.25rem,4vw,2rem)] shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
            Working draft
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">일정 초안</h2>
        </div>
        <span className="rounded-full bg-soft px-3 py-1.5 text-sm font-extrabold text-muted">
          revision {draft.revision}
        </span>
      </div>

      {draft.slots.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-line bg-soft px-5 py-12 text-center">
          <p className="text-lg font-extrabold">아직 입력한 일정이 없어요</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            왼쪽 양식에서 첫 장소와 시간을 추가해 주세요.
          </p>
        </div>
      ) : (
        <ol className="mt-7 grid gap-4">
          {draft.slots.map((slot, index) => (
            <li key={slot.id}>
              <SlotCard index={index + 1} slot={slot}>
                <button
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-extrabold hover:bg-soft"
                  onClick={() => onEdit(slot)}
                  type="button"
                >
                  수정
                </button>
                {confirmDeleteId === slot.id ? (
                  <>
                    <button
                      className="rounded-lg bg-red-700 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                      disabled={deletingSlotId === slot.id}
                      onClick={() => onConfirmDelete(slot.id)}
                      type="button"
                    >
                      {deletingSlotId === slot.id ? "삭제 중…" : "정말 삭제"}
                    </button>
                    <button
                      className="rounded-lg px-2 py-2 text-sm font-bold text-muted hover:bg-soft"
                      onClick={onCancelDelete}
                      type="button"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    className="rounded-lg px-3 py-2 text-sm font-extrabold text-red-700 hover:bg-red-50"
                    onClick={() => onRequestDelete(slot.id)}
                    type="button"
                  >
                    삭제
                  </button>
                )}
              </SlotCard>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-7 rounded-2xl border border-brand/20 bg-[#eff8ec] p-5">
        <h3 className="text-lg font-black">모두에게 일정 공개하기</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          발행하면 현재 초안이 변경되지 않는 새 버전으로 저장됩니다. 이후 수정은
          다음 버전으로 남아요.
        </p>
        <button
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            draft.slots.length === 0 ||
            unchanged ||
            publishMutation.phase === "submitting"
          }
          onClick={onPublish}
          type="button"
        >
          {publishMutation.phase === "submitting"
            ? "발행 중…"
            : unchanged
              ? "현재 초안은 이미 발행됨"
              : "새 일정 버전 발행"}
        </button>
        {publishMutation.phase === "error" ||
        publishMutation.phase === "success" ? (
          <p
            aria-live="polite"
            className={
              publishMutation.phase === "success"
                ? "mt-3 text-sm font-bold text-brand-strong"
                : "mt-3 text-sm font-bold text-red-700"
            }
          >
            {publishMutation.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PublishedPanel({
  current,
}: Readonly<{ current: ItineraryVersionResponse | null }>) {
  return (
    <section className="rounded-3xl border border-line bg-panel p-[clamp(1.25rem,4vw,2.25rem)] shadow-lg">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
            Published itinerary
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">현재 확정 일정</h2>
        </div>
        {current ? (
          <span className="rounded-full bg-highlight px-3 py-1.5 text-sm font-extrabold">
            버전 {current.versionNumber}
          </span>
        ) : null}
      </div>

      {!current ? (
        <div className="mt-7 rounded-2xl border border-dashed border-line bg-soft px-5 py-10 text-center">
          <p className="text-lg font-extrabold">아직 공개된 일정이 없어요</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            방장이 초안을 발행하면 모든 멤버가 이곳에서 같은 일정을 볼 수 있습니다.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm font-bold text-muted">
            {dateTimeFormatter.format(new Date(current.publishedAt))} 발행 · 원본 일정
          </p>
          <ol className="mt-7 grid gap-4 md:grid-cols-2">
            {current.slots.map((slot, index) => (
              <li key={slot.id}>
                <SlotCard index={index + 1} slot={slot} />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function SlotCard({
  children,
  index,
  slot,
}: Readonly<{
  children?: React.ReactNode;
  index: number;
  slot: ItinerarySlotResponse;
}>) {
  return (
    <article className="h-full rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-black text-white">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-brand-strong">
            {formatSlotRange(slot)}
          </p>
          <h3 className="mt-1 truncate text-xl font-black">{slot.placeName}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{slot.address}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold text-muted">
            <span className="rounded-full bg-soft px-2.5 py-1">
              {categoryLabel[slot.category]}
            </span>
            <span className="rounded-full bg-soft px-2.5 py-1">
              {slot.indoor ? "실내" : "야외"}
            </span>
            <span className="rounded-full bg-soft px-2.5 py-1">
              {wonFormatter.format(slot.expectedCost)}원
            </span>
          </div>
          {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
        </div>
      </div>
    </article>
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
        Trip itinerary
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">
        {title}
      </h1>
      <div className="mt-3 flex flex-col leading-7 text-muted">{children}</div>
    </section>
  );
}

function canEditItinerary(trip: TripSummaryResponse) {
  return (
    trip.role === "HOST" &&
    (trip.status === "DRAFT" || trip.status === "ACTIVE")
  );
}

function slotToDraft(slot: ItinerarySlotResponse): ItinerarySlotDraft {
  const start = seoulInputParts(slot.startsAt);
  const end = seoulInputParts(slot.endsAt);
  return {
    address: slot.address,
    category: slot.category,
    date: start.date,
    endTime: end.time,
    expectedCost: String(slot.expectedCost),
    indoor: slot.indoor,
    latitude: slot.latitude === null || slot.latitude === undefined ? "" : String(slot.latitude),
    longitude:
      slot.longitude === null || slot.longitude === undefined
        ? ""
        : String(slot.longitude),
    placeName: slot.placeName,
    startTime: start.time,
  };
}

function seoulInputParts(value: string) {
  const parts = Object.fromEntries(
    seoulInputFormatter
      .formatToParts(new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function formatSlotRange(slot: ItinerarySlotResponse) {
  return `${dateTimeFormatter.format(new Date(slot.startsAt))} – ${dateTimeFormatter.format(new Date(slot.endsAt))}`;
}

function formatTripDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00+09:00`));
}

function readApiCode(error: unknown): string | null {
  if (
    error instanceof ApiClientError &&
    typeof error.responseBody === "object" &&
    error.responseBody !== null &&
    "code" in error.responseBody &&
    typeof error.responseBody.code === "string"
  ) {
    return error.responseBody.code;
  }
  return null;
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

const categoryLabel: Record<ItineraryCategory, string> = {
  ACTIVITY: "활동",
  CAFE: "카페",
  CULTURE: "문화",
  MEAL: "식사",
  OTHER: "기타",
  SHOPPING: "쇼핑",
  TRANSIT: "이동",
};

const statusLabel: Record<TripSummaryResponse["status"], string> = {
  ACTIVE: "진행 중",
  ARCHIVED: "보관됨",
  COMPLETED: "완료",
  DRAFT: "준비 중",
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 font-semibold outline-none transition focus:border-brand focus:ring-3 focus:ring-[#5b9f5a22] aria-invalid:border-red-600 aria-invalid:ring-red-100";
const secondaryButtonClassName =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold transition hover:bg-soft";
const secondaryLinkClassName = `${secondaryButtonClassName} no-underline`;
