"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  MessageCircle,
  Share2,
  Users,
} from "lucide-react";

import { AppShell } from "../app-shell";
import { StepHeader } from "../common";
import { MEMBERS } from "../data/members";
import { ROUTES } from "../routes";

export function InviteScreen() {
  const [copied, setCopied] = useState(false);

  const copyText = async (value: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value).catch(() => undefined);
    }

    setCopied(true);
  };

  return (
    <AppShell screen="invite">
      <main className="app-page page-shell wizard-page">
        <StepHeader step={2} title="함께할 친구를 초대해요!" />
        <p className="subtitle wizard-subtitle">
          초대 링크를 받은 친구는 로그인만 하면 바로 참여할 수 있어요.
        </p>

        <div className="wizard-grid invite-grid">
          <section className="panel invite-panel">
            <p className="eyebrow">초대 코드</p>
            <div className="invite-code-row">
              <strong>DJ7K2M</strong>
              <button
                className="btn btn-soft"
                onClick={() => void copyText("DJ7K2M")}
              >
                <Copy size={19} strokeWidth={2.5} />
                {copied ? "복사 완료" : "코드 복사"}
              </button>
            </div>
            <div className="link-box">
              dajeong.app/join/DJ7K2M
              <button
                aria-label="링크 복사"
                onClick={() =>
                  void copyText("https://dajeong.app/join/DJ7K2M")
                }
              >
                <Copy size={18} />
              </button>
            </div>
            <p className="muted">
              초대 링크는 7일 뒤 만료돼요. 언제든 새로 만들 수 있어요.
            </p>
            <button className="btn btn-kakao">
              <MessageCircle size={22} fill="currentColor" />카카오톡으로
              공유하기
            </button>
            <div className="share-divider">
              <span>또는</span>
            </div>
            <button className="btn btn-outline full">
              <Share2 size={20} />링크 공유하기
            </button>
          </section>

          <aside className="panel member-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">참여 현황</p>
                <h3>친구들이 모이고 있어요</h3>
              </div>
              <strong>4 / 6명</strong>
            </div>
            <div className="member-list">
              {MEMBERS.map((member) => (
                <div className="member-row" key={member.name}>
                  <span className={`avatar ${member.color}`}>
                    {member.name[0]}
                  </span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>
                      {member.status === "방장"
                        ? "여행을 만들었어요"
                        : "선호 입력을 기다리는 중"}
                    </small>
                  </div>
                  <span
                    className={
                      member.status === "방장"
                        ? "host-badge"
                        : "complete-badge"
                    }
                  >
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="member-capacity">
              <Users size={19} strokeWidth={2.5} />2명 더 초대할 수 있어요
            </div>
          </aside>
        </div>

        <div className="wizard-actions">
          <Link className="btn btn-ghost" href={ROUTES.createTrip}>
            <ArrowLeft size={18} />이전
          </Link>
          <div>
            <Link className="btn btn-link" href={ROUTES.preferences}>
              나중에 초대하기
            </Link>
            <Link
              className="btn btn-primary btn-wide"
              href={ROUTES.preferences}
            >
              다음: 나의 선호 <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
