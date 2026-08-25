"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesColumn,
  Check,
  Clock,
  LockKeyhole,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { AvatarStack, PageTitle } from "../common";
import { ITINERARIES, type Itinerary } from "../data/itineraries";
import { ROUTES } from "../routes";

const VOTE_TOTALS: Record<Itinerary["id"], [number, number]> = {
  A: [12, 50],
  B: [7, 29],
  C: [5, 21],
};

export function VoteScreen() {
  const [choice, setChoice] = useState<Itinerary["id"]>("C");

  return (
    <AppShell screen="vote">
      <main className="app-page page-shell vote-page">
        <PageTitle
          eyebrow="제주도 우정여행"
          title="마음에 드는 일정을 선택해 주세요!"
          body="무기명 투표예요. 누가 무엇을 골랐는지 기록되지 않아요."
          action={
            <div className="countdown">
              <Clock size={19} strokeWidth={2.5} />
              <span>12시간 남음</span>
            </div>
          }
        />

        <div className="vote-grid">
          <section className="vote-options panel">
            <h3>내 선택</h3>
            {ITINERARIES.map((trip) => {
              const selected = choice === trip.id;

              return (
                <button
                  key={trip.id}
                  className={`vote-option ${selected ? "selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setChoice(trip.id)}
                >
                  <span className="radio">{selected ? <span /> : null}</span>
                  <div>
                    <p>
                      <b>일정 {trip.id}</b>
                      <strong>{trip.title}</strong>
                    </p>
                    <small>
                      이동 {trip.travel} · {trip.budget} · 피로도 {trip.fatigue}
                    </small>
                  </div>
                  {selected ? (
                    <span className="selection-label">
                      <Check size={15} strokeWidth={2.5} />선택됨
                    </span>
                  ) : null}
                </button>
              );
            })}
            <div className="anonymous-note">
              <LockKeyhole size={19} strokeWidth={2.5} />
              <span>선택은 마감 전까지 언제든 바꿀 수 있어요.</span>
            </div>
          </section>

          <aside className="vote-results panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">현재 집계</p>
                <h3>실시간 투표 현황</h3>
              </div>
              <span>내 표 포함</span>
            </div>
            <div className="result-bars">
              {Object.entries(VOTE_TOTALS).map(([id, [count, percent]]) => (
                <div className="result-row" key={id}>
                  <div>
                    <strong>일정 {id}</strong>
                    <span>
                      {count}표 ({percent}%)
                    </span>
                  </div>
                  <div className="result-track">
                    <span
                      className={`bar-${id.toLowerCase()}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="voter-summary">
              <AvatarStack compact />
              <strong>3 / 4명 투표 완료</strong>
            </div>
            <div className="fairness-note">
              <ChartNoAxesColumn size={20} strokeWidth={2.5} />
              <p>동표가 나오면, 그동안 의견이 덜 반영된 분의 선택을 따라요.</p>
            </div>
            <Link className="btn btn-primary full" href={ROUTES.confirmed}>
              투표 완료 <ArrowRight size={18} />
            </Link>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
