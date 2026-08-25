import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Grid3X3,
  House,
} from "lucide-react";

import { ROUTES, type ScreenId } from "./routes";

function Brand({ href = ROUTES.onboarding }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="다정 홈">
      <span className="brand-mark" aria-hidden="true" />
      <span>다정</span>
    </Link>
  );
}

function GlobalHeader({ screen }: { screen: ScreenId }) {
  if (screen === "onboarding") {
    return (
      <header className="global-header landing-header">
        <Brand />
        <nav className="top-nav" aria-label="주요 메뉴">
          <Link href={ROUTES.home}>다정 소개</Link>
          <Link href={ROUTES.createTrip}>여행 만들기</Link>
          <Link href={ROUTES.invite}>초대 코드 참여</Link>
        </nav>
        <Link className="btn btn-small btn-primary" href={ROUTES.home}>
          시작하기
        </Link>
      </header>
    );
  }

  return (
    <header className="global-header app-header">
      <Brand href={ROUTES.home} />
      <nav className="app-nav" aria-label="앱 메뉴">
        <Link className={screen === "home" ? "active" : ""} href={ROUTES.home}>
          <House size={20} strokeWidth={2.5} />홈
        </Link>
        <Link
          className={["detail", "confirmed"].includes(screen) ? "active" : ""}
          href={ROUTES.detail}
        >
          <CalendarDays size={20} strokeWidth={2.5} />일정
        </Link>
        <Link className={screen === "vote" ? "active" : ""} href={ROUTES.vote}>
          <ChartNoAxesColumn size={20} strokeWidth={2.5} />투표
        </Link>
        <Link
          className={screen === "recommend" ? "active" : ""}
          href={ROUTES.recommendations}
        >
          <Grid3X3 size={20} strokeWidth={2.5} />더보기
        </Link>
      </nav>
      <div className="header-actions">
        <button className="icon-button" aria-label="알림">
          <Bell size={21} strokeWidth={2.5} />
        </button>
        <div className="profile-avatar" aria-label="민지 프로필">
          민
        </div>
      </div>
    </header>
  );
}

export function AppShell({
  screen,
  children,
}: {
  screen: ScreenId;
  children: ReactNode;
}) {
  return (
    <div className={`app-root screen-${screen}`}>
      <GlobalHeader screen={screen} />
      {children}
    </div>
  );
}
