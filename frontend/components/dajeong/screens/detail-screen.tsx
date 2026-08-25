"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bus,
  Map,
  MapPin,
  MessageCircle,
  PersonStanding,
  SlidersHorizontal,
  Umbrella,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { AvatarStack, PageTitle } from "../common";
import { DAY_LABELS, TIMELINE, type TimelineItem } from "../data/timeline";
import { ROUTES } from "../routes";

const TIMELINE_ICONS: Record<TimelineItem["icon"], LucideIcon> = {
  bus: Bus,
  walk: PersonStanding,
  umbrella: Umbrella,
};

export function DetailScreen() {
  const [day, setDay] = useState(2);

  return (
    <AppShell screen="detail">
      <main className="app-page page-shell detail-page">
        <PageTitle
          eyebrow="확정된 여행"
          title="제주도 우정여행"
          body="2026.08.24 — 08.26 · 2박 3일"
          action={<div className="version-badge">v4 · 최신</div>}
        />

        <div className="day-tabs">
          {[1, 2, 3].map((item) => (
            <button
              className={day === item ? "active" : ""}
              key={item}
              aria-pressed={day === item}
              onClick={() => setDay(item)}
            >
              DAY {item}
              <small>{DAY_LABELS[item - 1]}</small>
            </button>
          ))}
        </div>

        <div className="detail-layout">
          <section className="timeline-panel panel">
            <div className="timeline-head">
              <div>
                <p>
                  <Umbrella size={18} fill="currentColor" />8월 25일 (월) · 26°
                  / 20° · 강수확률 60%
                </p>
                <span>
                  총 이동 <strong>72분</strong>
                </span>
                <span>
                  1인 예산 <strong>32,000원</strong>
                </span>
                <span>
                  피로도 <strong>낮음</strong>
                </span>
              </div>
              <button className="btn btn-outline">
                <SlidersHorizontal size={18} />일정 바꾸고 싶어요
              </button>
            </div>

            <div className="timeline-list">
              {TIMELINE.map((item, index) => {
                const Icon = TIMELINE_ICONS[item.icon];

                return (
                  <div className="timeline-item" key={item.time}>
                    <time>{item.time}</time>
                    <div
                      className={`timeline-dot ${item.changed ? "yellow" : ""}`}
                    />
                    <article className={item.changed ? "changed" : ""}>
                      <div className="place-row">
                        <div>
                          <h3>{item.title}</h3>
                          <p>
                            <span
                              className={`place-tag ${item.tag === "실내" ? "indoor" : ""}`}
                            >
                              {item.tag}
                            </span>
                            {item.meta}
                          </p>
                        </div>
                        {item.changed ? (
                          <span className="changed-badge">변경됨</span>
                        ) : null}
                      </div>
                      {index < TIMELINE.length - 1 || item.changed ? (
                        <div className="travel-note">
                          <Icon size={19} strokeWidth={2.5} />
                          <span>{item.travel}</span>
                        </div>
                      ) : null}
                    </article>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="detail-side">
            <section className="panel map-card">
              <div className="map-surface">
                <span className="map-pin pin-one">
                  <MapPin size={27} fill="currentColor" />
                </span>
                <span className="map-pin pin-two">
                  <MapPin size={27} fill="currentColor" />
                </span>
                <span className="map-pin pin-three">
                  <MapPin size={27} fill="currentColor" />
                </span>
                <div className="route-line" />
              </div>
              <div className="map-caption">
                <Map size={20} strokeWidth={2.5} />
                <div>
                  <strong>동쪽에서 시작해 제주시로</strong>
                  <p>우천 이동을 줄인 72분 동선이에요.</p>
                </div>
              </div>
            </section>

            <section className="panel companion-card">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">함께 가는 친구</p>
                  <h3>4명이 모두 확인했어요</h3>
                </div>
                <AvatarStack compact />
              </div>
              <div className="companion-note">
                <MessageCircle size={19} strokeWidth={2.5} />
                <p>“비 오는 오후에는 카페도 좋아요!”</p>
              </div>
              <Link className="text-button" href={ROUTES.vote}>
                투표 결과 다시 보기 <ArrowRight size={17} />
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
