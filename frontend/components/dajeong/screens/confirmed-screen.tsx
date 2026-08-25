import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesColumn,
  Share2,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { AvatarStack, Landscape } from "../common";
import { ROUTES } from "../routes";

export function ConfirmedScreen() {
  return (
    <AppShell screen="confirmed">
      <main className="app-page page-shell confirmed-page">
        <section className="celebration-copy">
          <div className="confetti-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mascot-window success-mascot" />
          <p className="eyebrow">제주도 우정여행 · 일정 확정</p>
          <h1>
            모두의 선택으로
            <br />
            여행 일정이 확정되었어요!
          </h1>
          <p>
            8월 24일부터 26일까지, 다정이가 날씨 변화까지 계속 살필게요.
          </p>
          <div className="celebration-actions">
            <button className="btn btn-yellow btn-large">
              <Share2 size={20} strokeWidth={2.5} />일정 공유하기
            </button>
            <Link
              className="btn btn-outline btn-large"
              href={ROUTES.detail}
            >
              상세 일정 보기 <ArrowRight size={19} />
            </Link>
          </div>
        </section>

        <section className="selected-trip panel">
          <div className="selected-head">
            <div>
              <p className="eyebrow">선택된 일정</p>
              <h2>일정 A · 여유로운 감성 여행</h2>
            </div>
            <span className="vote-winner">12표 · 50%</span>
          </div>
          <Landscape className="selected-landscape" />
          <div className="metric-row large">
            <span>
              <small>총 이동</small>
              <strong>1.2시간</strong>
            </span>
            <span>
              <small>1인 예산</small>
              <strong>32,000원</strong>
            </span>
            <span>
              <small>피로도</small>
              <strong>낮음</strong>
            </span>
            <span>
              <small>실내</small>
              <strong>66%</strong>
            </span>
          </div>
          <div className="fairness-note">
            <ChartNoAxesColumn size={20} strokeWidth={2.5} />
            <p>이번 일정은 의견이 덜 반영됐던 분의 선호를 우선했어요.</p>
          </div>
          <div className="participants-line">
            <AvatarStack />
            <span>함께 정한 4명의 여행</span>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
