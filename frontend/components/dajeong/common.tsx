import type { ReactNode } from "react";

import { MEMBERS } from "./data/members";

type PageTitleProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
};

export function AvatarStack({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`avatar-stack ${compact ? "compact" : ""}`}
      aria-label="참여자 4명"
    >
      {MEMBERS.map((member) => (
        <span
          className={`avatar ${member.color}`}
          key={member.name}
          title={member.name}
        >
          {compact ? "" : member.name.slice(0, 1)}
        </span>
      ))}
    </div>
  );
}

export function Landscape({ className = "" }: { className?: string }) {
  return (
    <div
      className={`landscape-source ${className}`}
      role="img"
      aria-label="초록 언덕과 햇살이 있는 다정 여행 일러스트"
    />
  );
}

export function PageTitle({ eyebrow, title, body, action }: PageTitleProps) {
  return (
    <div className="page-title-row">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {body ? <p className="subtitle">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="step-header">
      <div>
        <p className="eyebrow">새 여행 만들기</p>
        <h1>{title}</h1>
      </div>
      <div className="step-progress" aria-label={`${step}/3 단계`}>
        <div className="step-label">
          <span>STEP {step}</span>
          <strong>{step} / 3</strong>
        </div>
        <div className="step-track">
          <span style={{ width: `${step * 33.333}%` }} />
        </div>
        <div className="step-names">
          <span className={step >= 1 ? "done" : ""}>여행 정보</span>
          <span className={step >= 2 ? "done" : ""}>멤버 초대</span>
          <span className={step >= 3 ? "done" : ""}>나의 선호</span>
        </div>
      </div>
    </div>
  );
}
