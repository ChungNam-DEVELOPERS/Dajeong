"use client";

import { useState } from "react";
import {
  ChartNoAxesColumn,
  SlidersHorizontal,
  Sparkles,
  Umbrella,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { PageTitle } from "../common";
import { ITINERARIES } from "../data/itineraries";
import { RecommendationCard } from "../recommendation-card";
import { ROUTES } from "../routes";

export function RecommendationsScreen() {
  const [day, setDay] = useState(2);

  return (
    <AppShell screen="recommend">
      <main className="app-page page-shell recommend-page">
        <PageTitle
          eyebrow="다정이의 제안"
          title="모두가 만족할 일정 3가지를 만들었어요"
          body="날씨, 이동 시간, 예산과 각자의 비공개 선호를 함께 반영했어요."
          action={
            <div className="day-switch">
              {[1, 2, 3].map((item) => (
                <button
                  className={day === item ? "active" : ""}
                  key={item}
                  aria-pressed={day === item}
                  onClick={() => setDay(item)}
                >
                  DAY {item}
                </button>
              ))}
            </div>
          }
        />

        <div className="weather-alert">
          <span className="weather-icon">
            <Umbrella size={27} fill="currentColor" />
          </span>
          <div>
            <strong>비 오는 오후엔 실내 코스 어때요?</strong>
            <p>오후 3시부터 강수확률 70%예요. 실외 일정 1곳을 바꿨어요.</p>
          </div>
          <span className="day-badge">DAY {day}</span>
        </div>

        <div className="recommend-layout">
          <section className="recommend-grid">
            {ITINERARIES.map((trip, index) => (
              <RecommendationCard
                key={trip.id}
                trip={trip}
                href={ROUTES.vote}
                selected={index === 0}
              />
            ))}
          </section>

          <aside className="insight-panel">
            <div className="insight-title">
              <Sparkles size={23} fill="currentColor" />
              <div>
                <p className="eyebrow">추천 근거</p>
                <h3>모두의 상태를 반영했어요</h3>
              </div>
            </div>
            <div className="insight-item">
              <span className="signal coral" />
              <div>
                <small>체력</small>
                <strong>휴식 필요</strong>
              </div>
            </div>
            <div className="insight-item">
              <span className="signal yellow" />
              <div>
                <small>예산</small>
                <strong>여유 적음</strong>
              </div>
            </div>
            <div className="insight-item">
              <span className="signal green" />
              <div>
                <small>선호</small>
                <strong>자연·맛집 중심</strong>
              </div>
            </div>
            <div className="fairness-note">
              <ChartNoAxesColumn size={20} strokeWidth={2.5} />
              <p>
                그동안 의견이 덜 반영된 분의 취향을 이번 추천에 조금 더 크게
                반영했어요.
              </p>
            </div>
            <button className="btn btn-outline full">
              <SlidersHorizontal size={19} />비교 기준 바꾸기
            </button>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
