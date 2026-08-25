"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Heart,
  Leaf,
  Navigation,
  Search,
  Waves,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { StepHeader } from "../common";
import { TRAVEL_STYLES } from "../data/options";
import { ROUTES } from "../routes";

const STYLE_ICONS: Record<(typeof TRAVEL_STYLES)[number], LucideIcon> = {
  여유로운: Leaf,
  맛집: Heart,
  힐링: Waves,
  액티비티: Navigation,
  문화: Building2,
};

export function CreateTripScreen() {
  const [budget, setBudget] = useState(30);
  const [styles, setStyles] = useState<string[]>(["여유로운"]);

  const toggleStyle = (style: string) => {
    setStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style],
    );
  };

  return (
    <AppShell screen="create">
      <main className="app-page page-shell wizard-page">
        <StepHeader step={1} title="어디로 떠날까요?" />
        <div className="wizard-grid">
          <section className="panel form-panel">
            <div className="field-grid two">
              <label className="field">
                <span>여행 제목</span>
                <input defaultValue="제주도 우정여행" />
              </label>
              <label className="field">
                <span>여행지</span>
                <div className="input-with-icon">
                  <input defaultValue="제주도" />
                  <Search size={22} />
                </div>
                <small>인기 여행지: 제주도 · 강릉 · 부산 · 전주 · 여수</small>
              </label>
            </div>

            <div className="field">
              <span>여행 기간</span>
              <div className="date-pair">
                <button>
                  <CalendarDays size={20} />2026.08.24
                </button>
                <span>—</span>
                <button>
                  <CalendarDays size={20} />2026.08.26
                </button>
                <b>2박 3일</b>
              </div>
            </div>

            <div className="field">
              <span>
                여행 스타일 <i>복수 선택</i>
              </span>
              <div className="style-options">
                {TRAVEL_STYLES.map((label) => {
                  const Icon = STYLE_ICONS[label];
                  const selected = styles.includes(label);

                  return (
                    <button
                      key={label}
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      onClick={() => toggleStyle(label)}
                    >
                      <Icon size={24} strokeWidth={2.5} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field budget-field">
              <div className="range-heading">
                <span>1인 예산</span>
                <strong>{budget}만원</strong>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
              <div className="range-labels">
                <span>10만원</span>
                <span>80만원</span>
              </div>
            </div>
          </section>

          <aside className="panel helper-panel">
            <div className="mascot-window small-mascot" />
            <p className="eyebrow">다정의 한마디</p>
            <h3>
              함께 정할 여행의
              <br />큰 그림부터 알려주세요.
            </h3>
            <p>
              세부 장소는 모두의 선호를 받은 뒤 AI가 공평하게 제안해 드려요.
            </p>
            <div className="tip-list">
              <span>
                <Check size={16} strokeWidth={2.5} />나중에 언제든 수정 가능
              </span>
              <span>
                <Check size={16} strokeWidth={2.5} />개인 선호는 멤버에게 비공개
              </span>
            </div>
          </aside>
        </div>

        <div className="wizard-actions">
          <Link className="btn btn-ghost" href={ROUTES.home}>
            <ArrowLeft size={18} />취소
          </Link>
          <Link className="btn btn-primary btn-wide" href={ROUTES.invite}>
            다음: 멤버 초대 <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
