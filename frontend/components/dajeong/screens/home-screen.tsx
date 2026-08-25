import Link from "next/link";
import { ArrowRight, CalendarDays, Umbrella } from "lucide-react";

import { AppShell } from "../app-shell";
import { AvatarStack, PageTitle } from "../common";
import { ITINERARIES } from "../data/itineraries";
import { RecommendationCard } from "../recommendation-card";
import { ROUTES } from "../routes";

export function HomeScreen() {
  return (
    <AppShell screen="home">
      <main className="app-page page-shell home-page">
        <PageTitle
          eyebrow="다정이님, 안녕하세요! 👋"
          title="어디로 여행을 떠날까요?"
          action={
            <Link className="btn btn-primary" href={ROUTES.createTrip}>
              새 여행 만들기 <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          }
        />

        <section className="home-overview">
          <article className="trip-summary-card">
            <div className="summary-main">
              <span className="status-badge">투표 진행중</span>
              <h2>
                제주도 우정여행 <span className="green-heart">♥</span>
              </h2>
              <p>
                <CalendarDays size={18} /> 2026.08.24 — 08.26 <b>2박 3일</b>
              </p>
              <div className="summary-foot">
                <AvatarStack />
                <span>
                  마감까지 <strong>1일 12시간</strong>
                </span>
              </div>
            </div>
            <div className="summary-side">
              <span className="weather-icon">
                <Umbrella size={30} fill="currentColor" />
              </span>
              <div>
                <p>제주도 8.25 (월)</p>
                <strong>26° / 20°</strong>
                <span>강수확률 60%</span>
              </div>
              <small>우천 예상으로 실내·대체 코스를 추천했어요</small>
            </div>
          </article>

          <aside className="quick-card">
            <p className="eyebrow">다음 할 일</p>
            <h3>
              마음에 드는 일정에
              <br />
              투표해 주세요
            </h3>
            <div className="quick-progress">
              <span style={{ width: "75%" }} />
            </div>
            <p>4명 중 3명 참여 완료</p>
            <Link className="text-button" href={ROUTES.vote}>
              지금 투표하기 <ArrowRight size={17} />
            </Link>
          </aside>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <h2>AI가 제안한 맞춤 일정 3가지</h2>
              <p>날씨, 혼잡도, 등록된 선호를 반영했어요.</p>
            </div>
            <Link className="text-button" href={ROUTES.recommendations}>
              상세 비교 <ArrowRight size={17} />
            </Link>
          </div>
          <div className="recommend-grid compact-grid">
            {ITINERARIES.map((trip) => (
              <RecommendationCard
                key={trip.id}
                trip={trip}
                href={ROUTES.vote}
              />
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
