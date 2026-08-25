import type { ReactNode } from "react";
import Link from "next/link";

import { ROUTES, type ScreenId } from "./routes";

function Brand() {
  return (
    <Link className="brand" href={ROUTES.onboarding} aria-label="다정 홈">
      <span className="brand-mark" aria-hidden="true" />
      <span>다정</span>
    </Link>
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
      {children}
    </div>
  );
}
