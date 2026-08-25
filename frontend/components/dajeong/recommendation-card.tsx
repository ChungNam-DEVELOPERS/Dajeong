import Link from "next/link";

import type { Itinerary } from "./data/itineraries";
import { Landscape } from "./common";

export function RecommendationCard({
  trip,
  href,
  selected = false,
}: {
  trip: Itinerary;
  href: string;
  selected?: boolean;
}) {
  return (
    <article className={`recommend-card ${selected ? "selected" : ""}`}>
      <div className="card-kicker">
        <span>일정 {trip.id}</span>
        {trip.id === "A" ? <b>AI 추천</b> : null}
      </div>
      <h3>{trip.title}</h3>
      <div className="tag-row">
        {trip.tags.slice(0, 2).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <Landscape className={`mini-landscape variant-${trip.id.toLowerCase()}`} />
      <div className="metric-row">
        <span>
          <small>이동</small>
          <strong>{trip.travel}</strong>
        </span>
        <span>
          <small>예산</small>
          <strong>{trip.budget}</strong>
        </span>
        <span>
          <small>피로도</small>
          <strong>{trip.fatigue}</strong>
        </span>
      </div>
      <Link
        className={`btn ${trip.id === "A" ? "btn-primary" : "btn-yellow"}`}
        href={href}
      >
        이 일정에 투표하기
      </Link>
    </article>
  );
}
