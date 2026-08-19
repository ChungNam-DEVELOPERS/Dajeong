"use client";

import {
  ApiClientError,
  listNotifications,
  readNotification,
  type NotificationResponse,
} from "@dajeong/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";

import {
  initialNotificationState,
  notificationHref,
  notificationMessage,
  notificationStateReducer,
} from "./notification-state";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function NotificationWorkspace() {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    notificationStateReducer,
    initialNotificationState,
  );
  const [requestKey, setRequestKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void listNotifications({
      baseUrl: window.location.origin,
      limit: 12,
      signal: controller.signal,
    })
      .then((response) => dispatch({ response, type: "resolve" }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatchNotificationError(error, dispatch);
        }
      });
    return () => controller.abort();
  }, [requestKey]);

  async function loadMore() {
    if (state.phase !== "ready" || !state.nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setActionError(null);
    try {
      const response = await listNotifications({
        baseUrl: window.location.origin,
        cursor: state.nextCursor,
        limit: 12,
      });
      dispatch({ response, type: "append" });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        dispatch({ type: "unauthenticated" });
      } else {
        setActionError(readApiMessage(error, "다음 알림을 불러오지 못했습니다."));
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function openNotification(notification: NotificationResponse) {
    const href = notificationHref(notification);
    if (notification.readAt) {
      router.push(href);
      return;
    }
    setReadingId(notification.id);
    setActionError(null);
    try {
      const updated = await readNotification({
        baseUrl: window.location.origin,
        notificationId: notification.id,
      });
      dispatch({ notification: updated, type: "read" });
      router.push(href);
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 401) {
        dispatch({ type: "unauthenticated" });
      } else {
        setActionError(readApiMessage(error, "알림을 읽음 처리하지 못했습니다."));
      }
    } finally {
      setReadingId(null);
    }
  }

  if (state.phase === "loading") {
    return <WorkspaceNotice ariaBusy title="알림을 불러오고 있어요">최신 일정 변경과 읽음 상태를 확인 중입니다.</WorkspaceNotice>;
  }
  if (state.phase === "unauthenticated") {
    return (
      <WorkspaceNotice title="로그인하고 알림을 확인해 보세요">
        여행 일정 변경 알림은 로그인한 본인만 볼 수 있어요.
        <a className={primaryLinkClassName} href="/api/auth/login?returnTo=%2Fnotifications">소셜 로그인 시작하기</a>
      </WorkspaceNotice>
    );
  }
  if (state.phase === "error") {
    return (
      <WorkspaceNotice title="알림을 불러오지 못했어요">
        {state.message}
        <button className={secondaryButtonClassName} onClick={() => {
          dispatch({ type: "request" });
          setRequestKey((current) => current + 1);
        }} type="button">다시 시도</button>
      </WorkspaceNotice>
    );
  }

  const unreadCount = state.items.filter((item) => !item.readAt).length;
  return (
    <section className="rounded-3xl border border-line bg-white/80 p-[clamp(1.25rem,4vw,2.25rem)] shadow-xl backdrop-blur-sm" aria-labelledby="notification-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">Notifications</p>
          <h1 className="mt-2 text-[clamp(2rem,7vw,3.5rem)] leading-none font-black tracking-[-0.05em]" id="notification-title">알림함</h1>
          <p className="mt-3 leading-7 text-muted">그룹 투표로 바뀐 일정을 시간순으로 확인하세요.</p>
        </div>
        <span className="rounded-full bg-[#eff8ec] px-3 py-1.5 text-sm font-extrabold text-brand-strong">읽지 않음 {unreadCount}건</span>
      </div>

      {state.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-soft px-5 py-12 text-center">
          <p className="text-lg font-black">아직 새 알림이 없어요</p>
          <p className="mt-2 text-sm leading-6 text-muted">일정이 확정되면 여기에서 결과로 바로 이동할 수 있어요.</p>
        </div>
      ) : (
        <ul className="mt-7 grid gap-4">
          {state.items.map((notification) => {
            const unread = !notification.readAt;
            const busy = readingId === notification.id;
            return (
              <li key={notification.id}>
                <button
                  aria-label={`${notification.tripTitle} 일정 확정 결과 보기`}
                  className={`w-full rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70 ${unread ? "border-[#9ac294] bg-[#f3faf1]" : "border-line bg-white"}`}
                  disabled={busy}
                  onClick={() => void openNotification(notification)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-brand-strong">{notification.tripTitle}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${unread ? "bg-brand text-white" : "bg-soft text-muted"}`}>{unread ? "새 알림" : "읽음"}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-black">그룹 투표로 일정이 변경됐어요</h2>
                  <p className="mt-2 leading-7 text-muted">{notificationMessage(notification)}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-muted">
                    <time dateTime={notification.createdAt}>{dateTimeFormatter.format(new Date(notification.createdAt))}</time>
                    <span className="font-black text-brand-strong">{busy ? "읽음 처리 중…" : "확정 결과 보기 →"}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {state.nextCursor ? (
        <button className={`${secondaryButtonClassName} w-full`} disabled={loadingMore} onClick={() => void loadMore()} type="button">
          {loadingMore ? "불러오는 중…" : "알림 더 보기"}
        </button>
      ) : null}
      {actionError ? <p aria-live="polite" className="mt-4 text-sm font-bold text-red-700">{actionError}</p> : null}
    </section>
  );
}

function dispatchNotificationError(
  error: unknown,
  dispatch: React.Dispatch<Parameters<typeof notificationStateReducer>[1]>,
) {
  if (error instanceof ApiClientError && error.status === 401) {
    dispatch({ type: "unauthenticated" });
    return;
  }
  dispatch({ message: readApiMessage(error, "알림 API에 연결하지 못했습니다."), type: "reject" });
}

function readApiMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError && typeof error.responseBody === "object" && error.responseBody !== null && "message" in error.responseBody && typeof error.responseBody.message === "string"
    ? error.responseBody.message
    : fallback;
}

function WorkspaceNotice({ ariaBusy = false, children, title }: Readonly<{ ariaBusy?: boolean; children: React.ReactNode; title: string }>) {
  return (
    <section aria-busy={ariaBusy} aria-live="polite" className="mx-auto flex max-w-xl flex-col rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl">
      <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">Notifications</p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">{title}</h1>
      <div className="mt-3 flex flex-col leading-7 text-muted">{children}</div>
      <Link className="mt-4 font-extrabold text-brand-strong underline underline-offset-4" href="/trips">내 여행으로 돌아가기</Link>
    </section>
  );
}

const primaryLinkClassName = "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong";
const secondaryButtonClassName = "mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 py-3 font-extrabold transition hover:bg-soft disabled:opacity-60";
