"use client";

import {
  ApiClientError,
  createDisruption,
  dismissDisruption,
  getCurrentItinerary,
  getTrip,
  listDisruptions,
  startDisruptionReplan,
  type DisruptionListResponse,
  type ItineraryVersionResponse,
  type TripSummaryResponse,
} from "@dajeong/api-client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyDisruptionDraft,
  replaceDisruption,
  toCreateDisruptionRequest,
  validateDisruptionDraft,
  type DisruptionDraft,
  type DisruptionDraftErrors,
} from "./disruption-state";

type WorkspaceState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | { message: string; phase: "forbidden" }
  | { message: string; phase: "error" }
  | {
      current: ItineraryVersionResponse | null;
      list: DisruptionListResponse;
      phase: "ready";
      trip: TripSummaryResponse;
    };

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function DisruptionWorkspace({ tripId }: Readonly<{ tripId: string }>) {
  const [state, setState] = useState<WorkspaceState>({ phase: "loading" });
  const [draft, setDraft] = useState<DisruptionDraft>(
    createEmptyDisruptionDraft(),
  );
  const [errors, setErrors] = useState<DisruptionDraftErrors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void loadDisruptionWorkspace(tripId, controller.signal)
      .then(({ current, list, trip }) => {
        setDraft(createEmptyDisruptionDraft(current?.slots[0]?.id));
        setState({ current, list, phase: "ready", trip });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState(toWorkspaceError(error));
        }
      });
    return () => controller.abort();
  }, [requestKey, tripId]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDisruptionDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNotice("입력 내용을 다시 확인해 주세요.");
      return;
    }
    setBusy("create");
    setNotice("");
    try {
      const disruption = await createDisruption({
        baseUrl: window.location.origin,
        idempotencyKey: crypto.randomUUID(),
        request: toCreateDisruptionRequest(draft),
        tripId,
      });
      setState((current) =>
        current.phase === "ready"
          ? {
              ...current,
              list: {
                ...current.list,
                disruptions: replaceDisruption(
                  current.list.disruptions,
                  disruption,
                ),
              },
            }
          : current,
      );
      setDraft((current) => ({ ...current, description: "" }));
      setErrors({});
      setNotice("문제를 공유했습니다. 기존 일정은 그대로 유지됩니다.");
    } catch (error: unknown) {
      setNotice(readApiMessage(error, "문제를 신고하지 못했습니다."));
    } finally {
      setBusy(null);
    }
  }

  async function resolveDisruption(
    disruptionId: string,
    action: "dismiss" | "replan",
  ) {
    setBusy(`${action}:${disruptionId}`);
    setNotice("");
    try {
      const options = {
        baseUrl: window.location.origin,
        disruptionId,
        idempotencyKey: crypto.randomUUID(),
      };
      const updated =
        action === "dismiss"
          ? await dismissDisruption(options)
          : await startDisruptionReplan(options);
      setState((current) =>
        current.phase === "ready"
          ? {
              ...current,
              list: {
                ...current.list,
                disruptions: replaceDisruption(
                  current.list.disruptions,
                  updated,
                ),
              },
            }
          : current,
      );
      setNotice(
        action === "dismiss"
          ? "원본 일정을 유지하기로 기록했습니다."
          : "재조정 시작을 기록했습니다. 후보 생성은 다음 단계에서 연결됩니다.",
      );
    } catch (error: unknown) {
      setNotice(readApiMessage(error, "문제 상태를 변경하지 못했습니다."));
    } finally {
      setBusy(null);
    }
  }

  if (state.phase === "loading") {
    return <WorkspaceNotice ariaBusy title="문제 현황을 불러오고 있어요">잠시만 기다려 주세요.</WorkspaceNotice>;
  }
  if (state.phase === "unauthenticated") {
    return (
      <WorkspaceNotice title="로그인이 필요해요">
        <p>여행 멤버만 문제를 신고하고 처리할 수 있습니다.</p>
        <Link className={primaryClassName} href={`/login?returnTo=/trips/${tripId}/disruptions`}>
          로그인하기
        </Link>
      </WorkspaceNotice>
    );
  }
  if (state.phase === "forbidden") {
    return (
      <WorkspaceNotice title="이 여행을 볼 수 없어요">
        <p>{state.message}</p>
        <Link className={secondaryClassName} href="/trips">내 여행으로</Link>
      </WorkspaceNotice>
    );
  }
  if (state.phase === "error") {
    return (
      <WorkspaceNotice title="문제 현황을 불러오지 못했어요">
        <p>{state.message}</p>
        <button
          className={secondaryClassName}
          onClick={() => {
            setState({ phase: "loading" });
            setRequestKey((current) => current + 1);
          }}
          type="button"
        >
          다시 시도
        </button>
      </WorkspaceNotice>
    );
  }

  const canEdit = state.trip.status === "DRAFT" || state.trip.status === "ACTIVE";
  const hasCurrentSlots = Boolean(state.current?.slots.length);
  const createDisabled = !canEdit || !hasCurrentSlots || busy !== null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#ead5a8] bg-[#fff8e8] p-[clamp(1.5rem,5vw,3.5rem)] shadow-sm">
        <p className="text-xs font-black tracking-[0.12em] text-[#996019] uppercase">Trip disruption</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2rem,6vw,4rem)] leading-[1.05] font-black tracking-[-0.05em] text-ink">
          일정에 문제가 생겼나요?
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-[#6f665a]">
          휴관·교통·기타 상황을 그룹에 알려 주세요. 신고만으로 일정은 바뀌지 않으며,
          멤버가 유지 또는 재조정 시작을 직접 선택합니다.
        </p>
      </section>

      {notice ? (
        <p aria-live="polite" className="rounded-2xl border border-line bg-white px-5 py-4 font-bold text-[#5b5145]">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8" onSubmit={submitReport}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-[#996019]">새 문제 신고</p>
              <h2 className="mt-1 text-2xl font-black">그룹에 상황 알리기</h2>
            </div>
            <span className="rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-[#6f665a]">
              최대 200자
            </span>
          </div>

          {!hasCurrentSlots ? (
            <p className="mt-6 rounded-2xl bg-soft p-4 text-sm font-semibold leading-6 text-[#6f665a]">
              신고하려면 방장이 먼저 기존 일정을 발행해야 합니다.
            </p>
          ) : null}
          {!canEdit ? (
            <p className="mt-6 rounded-2xl bg-soft p-4 text-sm font-semibold leading-6 text-[#6f665a]">
              완료되거나 보관된 여행에서는 새 문제를 신고할 수 없습니다.
            </p>
          ) : null}

          <label className="mt-6 block text-sm font-extrabold" htmlFor="disruption-slot">
            문제가 생긴 일정
          </label>
          <select
            aria-invalid={Boolean(errors.itinerarySlotId)}
            className={inputClassName}
            disabled={createDisabled}
            id="disruption-slot"
            onChange={(event) => setDraft((current) => ({ ...current, itinerarySlotId: event.target.value }))}
            value={draft.itinerarySlotId}
          >
            <option value="">일정 장소 선택</option>
            {state.current?.slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.placeName} · {dateTimeFormatter.format(new Date(slot.startsAt))}
              </option>
            ))}
          </select>
          <FieldError message={errors.itinerarySlotId} />

          <label className="mt-5 block text-sm font-extrabold" htmlFor="disruption-type">문제 종류</label>
          <select
            className={inputClassName}
            disabled={createDisabled}
            id="disruption-type"
            onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as DisruptionDraft["type"] }))}
            value={draft.type}
          >
            <option value="CLOSURE">휴관</option>
            <option value="TRAFFIC">교통</option>
            <option value="OTHER">기타</option>
          </select>

          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="text-sm font-extrabold" htmlFor="disruption-description">상황 설명</label>
            <span className="text-xs font-bold text-[#6f665a]">{draft.description.length}/200</span>
          </div>
          <textarea
            aria-invalid={Boolean(errors.description)}
            className={`${inputClassName} min-h-32 resize-y`}
            disabled={createDisabled}
            id="disruption-description"
            maxLength={200}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="예: 현장 안내문에서 오늘 임시 휴관을 확인했어요."
            value={draft.description}
          />
          <FieldError message={errors.description} />

          <button className={`${primaryClassName} w-full disabled:cursor-not-allowed disabled:opacity-50`} disabled={createDisabled} type="submit">
            {busy === "create" ? "공유하는 중…" : "문제 공유하기"}
          </button>
        </form>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#3c713d]">그룹 문제 현황</p>
              <h2 className="mt-1 text-2xl font-black">함께 확인해요</h2>
            </div>
            <span className="text-sm font-extrabold text-[#6f665a]">총 {state.list.disruptions.length}건</span>
          </div>

          {state.list.disruptions.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-soft p-8 text-center">
              <p className="font-black">아직 공유된 문제가 없어요.</p>
              <p className="mt-2 text-sm leading-6 text-[#6f665a]">현재 일정에 문제가 생기면 왼쪽 양식으로 알려 주세요.</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {state.list.disruptions.map((item) => (
                <li className="rounded-2xl border border-line p-5" key={item.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#fff2cb] px-3 py-1 text-xs font-black text-[#7a4b0f]">{typeLabel[item.type]}</span>
                    <span className={`text-xs font-black ${statusClassName[item.status]}`}>{statusLabel[item.status]}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black">{item.placeName}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6f665a]">{dateTimeFormatter.format(new Date(item.slotStartsAt))} · 일정 v{item.itineraryVersionNumber}</p>
                  <p className="mt-4 whitespace-pre-wrap leading-7">{item.description}</p>
                  <p className="mt-4 text-xs font-bold text-[#6f665a]">{item.reporterDisplayName} · {dateTimeFormatter.format(new Date(item.reportedAt))}</p>

                  {item.status === "DETECTED" && canEdit ? (
                    <div className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
                      <button
                        className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-soft disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => void resolveDisruption(item.id, "dismiss")}
                        type="button"
                      >
                        {busy === `dismiss:${item.id}` ? "처리 중…" : "원본 일정 유지"}
                      </button>
                      <button
                        className="min-h-11 rounded-xl bg-[#3c713d] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#315d32] disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => void resolveDisruption(item.id, "replan")}
                        type="button"
                      >
                        {busy === `replan:${item.id}` ? "처리 중…" : "재조정 시작"}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function WorkspaceNotice({
  ariaBusy = false,
  children,
  title,
}: Readonly<{ ariaBusy?: boolean; children: React.ReactNode; title: string }>) {
  return (
    <section aria-busy={ariaBusy} aria-live="polite" className="mx-auto flex max-w-xl flex-col rounded-3xl border border-line bg-white p-8 shadow-sm">
      <p className="text-xs font-extrabold tracking-[0.08em] text-[#996019] uppercase">Trip disruption</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{title}</h1>
      <div className="mt-3 flex flex-col leading-7 text-[#6f665a]">{children}</div>
    </section>
  );
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? <p className="mt-1 text-sm font-bold text-red-700">{message}</p> : null;
}

function toWorkspaceError(error: unknown): WorkspaceState {
  if (error instanceof ApiClientError && error.status === 401) {
    return { phase: "unauthenticated" };
  }
  if (error instanceof ApiClientError && error.status === 403) {
    return { message: readApiMessage(error, "이 여행의 활성 멤버만 볼 수 있습니다."), phase: "forbidden" };
  }
  return { message: readApiMessage(error, "문제 신고 API에 연결하지 못했습니다."), phase: "error" };
}

async function loadDisruptionWorkspace(tripId: string, signal: AbortSignal) {
  const baseUrl = window.location.origin;
  const [trip, current, list] = await Promise.all([
    getTrip({ baseUrl, signal, tripId }),
    getCurrentItinerary({ baseUrl, signal, tripId }).catch((error: unknown) => {
      if (
        error instanceof ApiClientError &&
        error.status === 404 &&
        readApiCode(error) === "ITINERARY_NOT_PUBLISHED"
      ) {
        return null;
      }
      throw error;
    }),
    listDisruptions({ baseUrl, signal, tripId }),
  ]);
  return { current, list, trip };
}

function readApiCode(error: ApiClientError): string | null {
  return typeof error.responseBody === "object" && error.responseBody !== null && "code" in error.responseBody && typeof error.responseBody.code === "string"
    ? error.responseBody.code
    : null;
}

function readApiMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError && typeof error.responseBody === "object" && error.responseBody !== null && "message" in error.responseBody && typeof error.responseBody.message === "string"
    ? error.responseBody.message
    : fallback;
}

const typeLabel = { CLOSURE: "휴관", OTHER: "기타", TRAFFIC: "교통" } as const;
const statusLabel = { ACKNOWLEDGED: "재조정 시작", DETECTED: "확인 필요", DISMISSED: "원본 유지" } as const;
const statusClassName = { ACKNOWLEDGED: "text-[#3c713d]", DETECTED: "text-[#a35b00]", DISMISSED: "text-[#6f665a]" } as const;
const inputClassName = "mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 font-semibold outline-none transition focus:border-brand focus:ring-3 focus:ring-[#5b9f5a22] aria-invalid:border-red-600 disabled:bg-soft disabled:text-[#6f665a]";
const primaryClassName = "mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3c713d] px-6 py-3 font-extrabold text-white transition hover:bg-[#315d32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const secondaryClassName = "mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold transition hover:bg-soft";
