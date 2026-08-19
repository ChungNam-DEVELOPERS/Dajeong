"use client";

import {
  ApiClientError,
  getMyPrivatePreference,
  getPreferenceSubmissionStatus,
  getTrip,
  saveMyPrivatePreference,
  type PreferenceCategory,
  type PreferencePriority,
  type PreferenceStatusResponse,
  type PrivatePreferenceResponse,
  type TripSummaryResponse,
} from "@dajeong/api-client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ClockIcon from "@heroicons/react/24/outline/ClockIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";
import UserGroupIcon from "@heroicons/react/24/outline/UserGroupIcon";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  createEmptyPreferenceDraft,
  preferenceResponseToDraft,
  togglePreferenceSelection,
  toPrivatePreferenceRequest,
  validatePreferenceDraft,
  type PreferenceDraft,
  type PreferenceDraftErrors,
} from "./preference-state";

type WorkspaceState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | { message: string; phase: "forbidden" }
  | { message: string; phase: "error" }
  | {
      phase: "ready";
      preference: PrivatePreferenceResponse | null;
      status: PreferenceStatusResponse;
      trip: TripSummaryResponse;
    };

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { message: string; phase: "error" | "success" };

const wonFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export function PreferenceWorkspace({ tripId }: Readonly<{ tripId: string }>) {
  const [state, setState] = useState<WorkspaceState>({ phase: "loading" });
  const [draft, setDraft] = useState<PreferenceDraft>(createEmptyPreferenceDraft);
  const [errors, setErrors] = useState<PreferenceDraftErrors>({});
  const [saveState, setSaveState] = useState<SaveState>({ phase: "idle" });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void loadPreferenceWorkspace(tripId, controller.signal)
      .then((result) => {
        setState({ phase: "ready", ...result });
        setDraft(
          result.preference
            ? preferenceResponseToDraft(result.preference)
            : createEmptyPreferenceDraft(),
        );
        setErrors({});
        setSaveState({ phase: "idle" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState(toWorkspaceError(error));
        }
      });

    return () => controller.abort();
  }, [requestKey, tripId]);

  async function savePreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "ready" || !canEditPreference(state.trip)) {
      return;
    }
    const nextErrors = validatePreferenceDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveState({
        message: "입력한 선호 정보를 다시 확인해 주세요.",
        phase: "error",
      });
      return;
    }

    setSaveState({ phase: "saving" });
    try {
      const preference = await saveMyPrivatePreference({
        baseUrl: window.location.origin,
        request: toPrivatePreferenceRequest(draft),
        tripId,
      });
      setState((current) =>
        current.phase === "ready"
          ? {
              ...current,
              preference,
              status: markMemberSubmitted(current.status, preference.userId),
            }
          : current,
      );
      setDraft(preferenceResponseToDraft(preference));
      setSaveState({
        message: "선호를 비공개로 저장했습니다. 제출 현황도 바로 반영됐어요.",
        phase: "success",
      });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ phase: "unauthenticated" });
        return;
      }
      setSaveState({
        message: readApiMessage(
          error,
          "선호를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
        phase: "error",
      });
    }
  }

  if (state.phase === "loading") {
    return (
      <WorkspaceNotice ariaBusy title="나의 선호를 불러오고 있어요">
        내 비공개 답변과 멤버들의 제출 여부를 안전하게 확인 중입니다.
      </WorkspaceNotice>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <WorkspaceNotice title="로그인하고 선호를 입력해 보세요">
        이 여행의 선호를 제출하려면 로그인이 필요합니다.
        <a
          className={primaryLinkClassName}
          href={`/api/auth/login?returnTo=${encodeURIComponent(`/trips/${tripId}/preferences`)}`}
        >
          소셜 로그인 시작하기
        </a>
      </WorkspaceNotice>
    );
  }

  if (state.phase === "forbidden") {
    return (
      <WorkspaceNotice title="이 여행의 선호를 볼 수 없어요">
        {state.message}
        <Link className={secondaryLinkClassName} href="/trips">
          내 여행으로 돌아가기
        </Link>
      </WorkspaceNotice>
    );
  }

  if (state.phase === "error") {
    return (
      <WorkspaceNotice title="선호 정보를 불러오지 못했어요">
        {state.message}
        <button
          className={secondaryButtonClassName}
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

  const editable = canEditPreference(state.trip);
  return (
    <div className="grid gap-7">
      <PreferenceHero trip={state.trip} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(290px,0.8fr)] lg:items-start">
        <PreferenceForm
          draft={draft}
          editable={editable}
          errors={errors}
          hasSubmitted={state.preference !== null}
          onChange={(nextDraft) => {
            setDraft(nextDraft);
            setSaveState({ phase: "idle" });
          }}
          onSubmit={savePreference}
          saveState={saveState}
        />
        <SubmissionStatus status={state.status} />
      </div>
    </div>
  );
}

async function loadPreferenceWorkspace(tripId: string, signal: AbortSignal) {
  const baseUrl = window.location.origin;
  const preferenceRequest = getMyPrivatePreference({ baseUrl, signal, tripId }).catch(
    (error: unknown) => {
      if (
        error instanceof ApiClientError &&
        error.status === 404 &&
        readApiCode(error) === "PREFERENCE_NOT_SUBMITTED"
      ) {
        return null;
      }
      throw error;
    },
  );
  const [trip, preference, status] = await Promise.all([
    getTrip({ baseUrl, signal, tripId }),
    preferenceRequest,
    getPreferenceSubmissionStatus({ baseUrl, signal, tripId }),
  ]);
  return { preference, status, trip };
}

function PreferenceHero({ trip }: Readonly<{ trip: TripSummaryResponse }>) {
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-panel shadow-xl">
      <div className="grid gap-5 bg-[#fffaf0] p-[clamp(1.5rem,5vw,3rem)] sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-extrabold tracking-[0.09em] text-[#3c713d] uppercase">
            Private preference
          </p>
          <h1 className="mt-2 text-[clamp(2rem,7vw,4rem)] leading-none font-black tracking-[-0.055em]">
            나의 선호
          </h1>
          <p className="mt-4 font-bold text-[#6f665a]">
            {trip.title} · {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-[#3c713d] shadow-sm">
            {trip.role === "HOST" ? "방장" : "멤버"}
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-[#6f665a] shadow-sm">
            {statusLabel[trip.status]}
          </span>
        </div>
      </div>
    </section>
  );
}

function PreferenceForm({
  draft,
  editable,
  errors,
  hasSubmitted,
  onChange,
  onSubmit,
  saveState,
}: Readonly<{
  draft: PreferenceDraft;
  editable: boolean;
  errors: PreferenceDraftErrors;
  hasSubmitted: boolean;
  onChange: (draft: PreferenceDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saveState: SaveState;
}>) {
  function update<Key extends keyof PreferenceDraft>(
    key: Key,
    value: PreferenceDraft[Key],
  ) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <section className="rounded-3xl border border-line bg-panel p-[clamp(1.25rem,4vw,2rem)] shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#3c713d] uppercase">
            Step 3 of 3
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            여행 취향을 알려주세요
          </h2>
          <p className="mt-2 leading-7 text-[#6f665a]">
            모두가 편안한 일정을 만들 때 기준으로 사용할게요.
          </p>
        </div>
        {hasSubmitted ? (
          <span className="rounded-full bg-[#edf7ea] px-3 py-1.5 text-sm font-extrabold text-[#3c713d]">
            제출 완료
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border border-[#efd98e] bg-[#fff6cf] p-4 text-[#5f4b0f]">
        <LockClosedIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm leading-6 font-bold">
          답변 원문은 나만 볼 수 있어요. 다른 멤버에게는 제출 여부만 표시됩니다.
        </p>
      </div>

      {!editable ? (
        <div className="mt-5 rounded-2xl border border-line bg-soft p-4 text-sm leading-6 font-bold text-[#6f665a]">
          완료되거나 보관된 여행의 선호는 확인만 할 수 있고 수정할 수 없습니다.
        </div>
      ) : null}

      <form className="mt-7 grid gap-8" noValidate onSubmit={onSubmit}>
        <fieldset disabled={!editable || saveState.phase === "saving"}>
          <div className="grid gap-8">
            <FormField
              description="숙박을 제외하고 한 사람이 사용할 수 있는 금액이에요."
              error={errors.budgetPerPerson}
              htmlFor="preference-budget"
              label="1인 예산"
            >
              <div className="relative mt-3">
                <input
                  aria-describedby={
                    errors.budgetPerPerson
                      ? "preference-budget-error"
                      : "preference-budget-description"
                  }
                  aria-invalid={Boolean(errors.budgetPerPerson)}
                  className={`${inputClassName} pr-12`}
                  id="preference-budget"
                  max={100_000_000}
                  min={0}
                  onChange={(event) => update("budgetPerPerson", event.target.value)}
                  step={10_000}
                  type="number"
                  value={draft.budgetPerPerson}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-extrabold text-[#6f665a]">
                  원
                </span>
              </div>
              {isValidBudget(draft.budgetPerPerson) ? (
                <p className="mt-2 text-sm font-extrabold text-[#3c713d]">
                  {wonFormatter.format(Number(draft.budgetPerPerson))}원
                </p>
              ) : null}
            </FormField>

            <RangeField
              description="쉬는 시간과 활동 시간을 어느 정도로 배분할지 알려주세요."
              error={errors.activityLevel}
              id="preference-activity"
              label="활동 강도"
              leftLabel="여유롭게"
              onChange={(value) => update("activityLevel", value)}
              rightLabel="알차게"
              value={draft.activityLevel}
            />

            <RangeField
              description="좋은 장소를 위해 이동할 수 있는 정도를 선택해 주세요."
              error={errors.travelTolerance}
              id="preference-travel"
              label="이동 허용 정도"
              leftLabel="가까운 곳"
              onChange={(value) => update("travelTolerance", value)}
              rightLabel="멀리도 좋아요"
              value={draft.travelTolerance}
            />

            <ChipField
              description="좋아하는 경험은 여러 개 골라도 괜찮아요."
              error={errors.preferredCategories}
              id="preference-categories"
              legend="관심 카테고리"
              options={categoryOptions}
              selected={draft.preferredCategories}
              onToggle={(value) =>
                update(
                  "preferredCategories",
                  togglePreferenceSelection(draft.preferredCategories, value, 7),
                )
              }
            />

            <ChipField
              description={`일정을 고를 때 꼭 지키고 싶은 기준이에요. 최대 2개 · ${draft.priorities.length}/2`}
              error={errors.priorities}
              id="preference-priorities"
              legend="이번 여행 우선순위"
              options={priorityOptions}
              selected={draft.priorities}
              onToggle={(value) =>
                update(
                  "priorities",
                  togglePreferenceSelection(draft.priorities, value, 2),
                )
              }
            />
          </div>
        </fieldset>

        {editable ? (
          <button
            className="inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#3c713d] px-6 py-3.5 text-lg font-extrabold text-white shadow-sm transition hover:bg-[#315d32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
            disabled={saveState.phase === "saving"}
            type="submit"
          >
            {saveState.phase === "saving"
              ? "비공개로 저장 중…"
              : hasSubmitted
                ? "선호 다시 저장하기"
                : "선호 제출 완료"}
          </button>
        ) : null}

        {saveState.phase === "error" || saveState.phase === "success" ? (
          <p
            aria-live="polite"
            className={
              saveState.phase === "success"
                ? "text-sm font-bold text-[#3c713d]"
                : "text-sm font-bold text-red-700"
            }
          >
            {saveState.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function RangeField({
  description,
  error,
  id,
  label,
  leftLabel,
  onChange,
  rightLabel,
  value,
}: Readonly<{
  description: string;
  error?: string;
  id: string;
  label: string;
  leftLabel: string;
  onChange: (value: number) => void;
  rightLabel: string;
  value: number;
}>) {
  return (
    <FormField description={description} error={error} htmlFor={id} label={label}>
      <div className="mt-4 flex items-center gap-4">
        <input
          aria-describedby={error ? `${id}-error` : `${id}-description`}
          aria-invalid={Boolean(error)}
          className="h-2 w-full cursor-pointer accent-brand"
          id={id}
          max={5}
          min={1}
          onChange={(event) => onChange(Number(event.target.value))}
          type="range"
          value={value}
        />
        <output
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7ea] text-lg font-black text-[#3c713d]"
          htmlFor={id}
        >
          {value}
        </output>
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold text-[#6f665a]">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </FormField>
  );
}

function ChipField<Value extends string>({
  description,
  error,
  id,
  legend,
  onToggle,
  options,
  selected,
}: Readonly<{
  description: string;
  error?: string;
  id: string;
  legend: string;
  onToggle: (value: Value) => void;
  options: readonly { label: string; value: Value }[];
  selected: readonly Value[];
}>) {
  return (
    <fieldset
      aria-describedby={error ? `${id}-error` : `${id}-description`}
      aria-invalid={Boolean(error)}
    >
      <legend className="text-lg font-black">{legend}</legend>
      <p className="mt-1 text-sm leading-6 text-[#6f665a]" id={`${id}-description`}>
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              aria-pressed={active}
              className={
                active
                  ? "min-h-11 rounded-full border border-brand bg-[#edf7ea] px-4 py-2 text-sm font-extrabold text-[#3c713d] shadow-sm"
                  : "min-h-11 rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold text-[#6f665a] transition hover:border-brand hover:text-[#3c713d]"
              }
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-sm font-bold text-red-700" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function FormField({
  children,
  description,
  error,
  htmlFor,
  label,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  error?: string;
  htmlFor: string;
  label: string;
}>) {
  return (
    <div>
      <label className="text-lg font-black" htmlFor={htmlFor}>
        {label}
      </label>
      <p className="mt-1 text-sm leading-6 text-[#6f665a]" id={`${htmlFor}-description`}>
        {description}
      </p>
      {children}
      {error ? (
        <p className="mt-2 text-sm font-bold text-red-700" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmissionStatus({ status }: Readonly<{ status: PreferenceStatusResponse }>) {
  const progress =
    status.totalCount === 0 ? 0 : (status.submittedCount / status.totalCount) * 100;
  return (
    <aside className="rounded-3xl border border-line bg-white/85 p-[clamp(1.25rem,4vw,2rem)] shadow-lg backdrop-blur-sm lg:sticky lg:top-8">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf7ea] text-[#3c713d]">
          <UserGroupIcon aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#3c713d] uppercase">
            Submission status
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">
            멤버 제출 현황
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-soft p-5">
        <div className="flex items-end justify-between gap-3">
          <p className="font-extrabold text-[#6f665a]">제출 완료</p>
          <p className="text-3xl font-black tracking-[-0.05em]">
            {status.submittedCount}
            <span className="ml-1 text-base tracking-normal text-[#6f665a]">
              / {status.totalCount}명
            </span>
          </p>
        </div>
        <div
          aria-label={`선호 제출률 ${Math.round(progress)}퍼센트`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className="mt-4 h-2 overflow-hidden rounded-full bg-white"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="mt-5 grid gap-2.5">
        {status.members.map((member) => (
          <li
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3"
            key={member.memberId}
          >
            <div className="min-w-0">
              <p className="truncate font-extrabold">{member.displayName}</p>
              <p className="mt-0.5 text-xs font-bold text-[#6f665a]">
                {member.role === "HOST" ? "방장" : "멤버"}
              </p>
            </div>
            <span
              className={
                member.submitted
                  ? "flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-[#3c713d]"
                  : "flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-[#6f665a]"
              }
            >
              {member.submitted ? (
                <CheckCircleIcon aria-hidden="true" className="size-5" />
              ) : (
                <ClockIcon aria-hidden="true" className="size-5" />
              )}
              {member.submitted ? "완료" : "대기"}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-line pt-5 text-sm leading-6 text-[#6f665a]">
        이 화면에서는 누가 제출했는지만 확인할 수 있으며, 다른 사람의 예산이나
        취향은 공개되지 않습니다.
      </p>
    </aside>
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
      <p className="text-xs font-extrabold tracking-[0.08em] text-[#3c713d] uppercase">
        Private preference
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">
        {title}
      </h1>
      <div className="mt-3 flex flex-col leading-7 text-[#6f665a]">{children}</div>
    </section>
  );
}

function toWorkspaceError(error: unknown): WorkspaceState {
  if (error instanceof ApiClientError && error.status === 401) {
    return { phase: "unauthenticated" };
  }
  if (error instanceof ApiClientError && error.status === 403) {
    return {
      message: readApiMessage(error, "이 여행의 활성 멤버만 선호 현황을 볼 수 있습니다."),
      phase: "forbidden",
    };
  }
  return {
    message: readApiMessage(
      error,
      "선호 API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ),
    phase: "error",
  };
}

function markMemberSubmitted(
  status: PreferenceStatusResponse,
  userId: string,
): PreferenceStatusResponse {
  const member = status.members.find((current) => current.memberId === userId);
  if (!member || member.submitted) {
    return status;
  }
  return {
    ...status,
    members: status.members.map((current) =>
      current.memberId === userId ? { ...current, submitted: true } : current,
    ),
    submittedCount: status.submittedCount + 1,
  };
}

function canEditPreference(trip: TripSummaryResponse) {
  return trip.status === "DRAFT" || trip.status === "ACTIVE";
}

function isValidBudget(value: string) {
  const budget = Number(value);
  return Number.isInteger(budget) && budget >= 0 && budget <= 100_000_000;
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

const categoryOptions: readonly {
  label: string;
  value: PreferenceCategory;
}[] = [
  { label: "자연", value: "NATURE" },
  { label: "맛집", value: "FOOD" },
  { label: "카페", value: "CAFE" },
  { label: "문화", value: "CULTURE" },
  { label: "쇼핑", value: "SHOPPING" },
  { label: "액티비티", value: "ACTIVITY" },
  { label: "체험", value: "EXPERIENCE" },
];

const priorityOptions: readonly {
  label: string;
  value: PreferencePriority;
}[] = [
  { label: "유연한 일정", value: "FLEXIBLE_SCHEDULE" },
  { label: "자연과 힐링", value: "NATURE_HEALING" },
  { label: "맛집 탐방", value: "FOOD_EXPLORATION" },
  { label: "이동 최소화", value: "MINIMIZE_TRAVEL" },
  { label: "예산 절약", value: "SAVE_BUDGET" },
];

const statusLabel: Record<TripSummaryResponse["status"], string> = {
  ACTIVE: "진행 중",
  ARCHIVED: "보관됨",
  COMPLETED: "완료",
  DRAFT: "준비 중",
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 font-semibold outline-none transition focus:border-brand focus:ring-3 focus:ring-[#5b9f5a22] aria-invalid:border-red-600 aria-invalid:ring-red-100 disabled:bg-soft disabled:text-[#6f665a]";
const primaryLinkClassName =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3c713d] px-6 py-3 font-extrabold text-white transition hover:bg-[#315d32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const secondaryButtonClassName =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold transition hover:bg-soft";
const secondaryLinkClassName = `${secondaryButtonClassName} no-underline`;
