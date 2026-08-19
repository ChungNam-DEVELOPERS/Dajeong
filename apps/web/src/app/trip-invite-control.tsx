"use client";

import { ApiClientError, issueTripInvite } from "@dajeong/api-client";
import { useState } from "react";

type InviteIssueState =
  | { phase: "idle" }
  | { phase: "issuing" }
  | { link: string; expiresAt: string; phase: "ready" }
  | { message: string; phase: "error" };

const expiryFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "long",
  timeZone: "Asia/Seoul",
});

export function TripInviteControl({ tripId }: Readonly<{ tripId: string }>) {
  const [state, setState] = useState<InviteIssueState>({ phase: "idle" });
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function issueInvite() {
    setState({ phase: "issuing" });
    setCopyMessage(null);
    try {
      const invite = await issueTripInvite({
        baseUrl: window.location.origin,
        tripId,
      });
      setState({
        expiresAt: invite.expiresAt,
        link: `${window.location.origin}/invites/${encodeURIComponent(invite.code)}`,
        phase: "ready",
      });
    } catch (error: unknown) {
      setState({
        message: readApiMessage(
          error,
          "초대 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
        phase: "error",
      });
    }
  }

  async function copyInviteLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("초대 링크를 복사했습니다.");
    } catch {
      setCopyMessage("자동 복사하지 못했습니다. 링크를 직접 선택해 주세요.");
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-extrabold">멤버 초대</p>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
          disabled={state.phase === "issuing"}
          onClick={() => void issueInvite()}
          type="button"
        >
          {state.phase === "issuing"
            ? "발급 중…"
            : state.phase === "ready"
              ? "새 링크 발급"
              : "초대 링크 발급"}
        </button>
      </div>

      {state.phase === "ready" ? (
        <div className="mt-3 grid gap-2">
          <label className="sr-only" htmlFor={`invite-link-${tripId}`}>
            초대 링크
          </label>
          <div className="flex gap-2">
            <input
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-soft px-3 text-sm font-semibold outline-none focus:border-brand"
              id={`invite-link-${tripId}`}
              readOnly
              type="text"
              value={state.link}
            />
            <button
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={() => void copyInviteLink(state.link)}
              type="button"
            >
              복사
            </button>
          </div>
          <p className="text-xs font-semibold text-muted">
            {expiryFormatter.format(new Date(state.expiresAt))}까지 사용할 수 있어요.
          </p>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <p className="mt-3 text-sm font-bold text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}
      {copyMessage ? (
        <p aria-live="polite" className="mt-2 text-xs font-bold text-muted">
          {copyMessage}
        </p>
      ) : null}
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
