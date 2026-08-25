"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { StepHeader } from "../common";
import { TOURISM_THEMES, TRAVEL_PRIORITIES } from "../data/options";
import { ROUTES } from "../routes";

function toggleSelection(current: string[], value: string, max: number) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }

  return current.length < max ? [...current, value] : current;
}

function RangeField({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="preference-range">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div>
        <small>{left}</small>
        <small>{right}</small>
      </div>
    </label>
  );
}

export function PreferencesScreen() {
  const [ranges, setRanges] = useState({
    budget: 34,
    activity: 68,
    travel: 49,
  });
  const [themes, setThemes] = useState<string[]>(["자연", "맛집", "카페"]);
  const [priorities, setPriorities] = useState<string[]>([
    "여유로운 일정",
    "자연 속 힐링",
  ]);

  return (
    <AppShell screen="preferences">
      <main className="app-page page-shell wizard-page preference-page">
        <StepHeader step={3} title="AI가 나만의 취향을 반영해요" />

        <div className="privacy-banner">
          <LockKeyhole size={23} strokeWidth={2.5} />
          <div>
            <strong>이 답변은 일행에게 보이지 않아요</strong>
            <p>
              다정이만 보고, 그룹에는 “예산 여유 적음” 같은 전체 경향으로만
              전달돼요.
            </p>
          </div>
        </div>

        <div className="preference-grid">
          <section className="panel sliders-panel">
            <h3>여행 리듬</h3>
            <RangeField
              label="예산 여유도"
              left="아낌"
              right="여유"
              value={ranges.budget}
              onChange={(budget) =>
                setRanges((current) => ({ ...current, budget }))
              }
            />
            <RangeField
              label="활동 강도"
              left="느긋"
              right="활동적"
              value={ranges.activity}
              onChange={(activity) =>
                setRanges((current) => ({ ...current, activity }))
              }
            />
            <RangeField
              label="이동 감수"
              left="짧게"
              right="괜찮아요"
              value={ranges.travel}
              onChange={(travel) =>
                setRanges((current) => ({ ...current, travel }))
              }
            />
          </section>

          <section className="panel chips-panel">
            <div className="chip-group">
              <div className="chip-heading">
                <h3>관광 소재</h3>
                <span>복수 선택</span>
              </div>
              <div className="choice-chips">
                {TOURISM_THEMES.map((theme) => {
                  const selected = themes.includes(theme);

                  return (
                    <button
                      className={selected ? "selected" : ""}
                      key={theme}
                      aria-pressed={selected}
                      onClick={() =>
                        setThemes((current) =>
                          toggleSelection(current, theme, 5),
                        )
                      }
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="chip-group priority-group">
              <div className="chip-heading">
                <h3>내가 중요하게 생각하는 것</h3>
                <span>최대 2개</span>
              </div>
              <div className="choice-chips">
                {TRAVEL_PRIORITIES.map((priority) => {
                  const selected = priorities.includes(priority);

                  return (
                    <button
                      className={selected ? "selected" : ""}
                      key={priority}
                      aria-pressed={selected}
                      onClick={() =>
                        setPriorities((current) =>
                          toggleSelection(current, priority, 2),
                        )
                      }
                    >
                      {priority}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="private-summary">
              <Sparkles size={20} fill="currentColor" />
              <div>
                <strong>다정이 이해한 나의 취향</strong>
                <p>
                  적당히 활동적이지만 이동은 짧게, 자연과 맛집을 중심으로
                  여유롭게.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="wizard-actions">
          <Link className="btn btn-ghost" href={ROUTES.invite}>
            <ArrowLeft size={18} />이전
          </Link>
          <Link
            className="btn btn-primary btn-wide"
            href={ROUTES.recommendations}
          >
            취향 저장하고 일정 보기 <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
