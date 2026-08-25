import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesColumn,
  Map,
  Sparkles,
  Umbrella,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { AvatarStack, Landscape } from "../common";
import { ROUTES } from "../routes";

export function OnboardingScreen() {
  return (
    <AppShell screen="onboarding">
      <main className="landing-page page-shell">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">함께라서 더 좋은 여행 계획</p>
            <h1>
              다 함께 정하는 여행,
              <br />
              <em>다정</em>하게 시작해요.
            </h1>
            <p className="hero-description">
              날씨와 동선은 AI가 살피고, 각자의 취향은 비공개로 반영해요.
              누구 하나 양보하지 않아도 모두가 만족하는 여행을 만들 수 있어요.
            </p>
            <div className="hero-actions">
              <Link
                className="btn btn-primary btn-large"
                href={ROUTES.createTrip}
              >
                여행 계획 시작하기 <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <Link className="btn btn-outline btn-large" href={ROUTES.invite}>
                초대받은 여행 참여하기
              </Link>
            </div>
            <div className="trust-row">
              <AvatarStack compact />
              <span>
                <strong>오늘 128팀</strong>이 다정하게 여행을 정하고 있어요
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Landscape className="hero-landscape" />
            </div>
            <div className="floating-note note-top">
              <Sparkles size={20} fill="currentColor" />
              <span>
                우리 모두의 취향을
                <br />
                <strong>공평하게 반영 완료!</strong>
              </span>
            </div>
            <div className="floating-note note-bottom">
              <Umbrella size={20} fill="currentColor" />
              <span>
                비 소식까지 반영한
                <br />
                <strong>실내 코스 추천</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="benefit-strip" aria-label="다정 핵심 기능">
          <article>
            <span className="benefit-icon green">
              <Umbrella size={24} strokeWidth={2.5} />
            </span>
            <div>
              <strong>실시간 변화 대응</strong>
              <p>날씨·혼잡·동선 변화 반영</p>
            </div>
          </article>
          <article>
            <span className="benefit-icon yellow">
              <Sparkles size={24} fill="currentColor" />
            </span>
            <div>
              <strong>우리만의 맞춤 일정</strong>
              <p>예산·피로도·취향을 비공개로</p>
            </div>
          </article>
          <article>
            <span className="benefit-icon dark">
              <ChartNoAxesColumn size={24} strokeWidth={2.5} />
            </span>
            <div>
              <strong>공정한 일정 합의</strong>
              <p>익명 투표로 편안한 선택</p>
            </div>
          </article>
          <article>
            <span className="benefit-icon cream">
              <Map size={24} strokeWidth={2.5} />
            </span>
            <div>
              <strong>신뢰할 수 있는 정보</strong>
              <p>실시간 관광 데이터 기반</p>
            </div>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
