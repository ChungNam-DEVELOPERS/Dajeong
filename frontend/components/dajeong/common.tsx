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
