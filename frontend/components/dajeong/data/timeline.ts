export type TimelineItem = {
  time: string;
  title: string;
  tag: "실외" | "식사" | "실내";
  meta: string;
  travel: string;
  icon: "bus" | "walk" | "umbrella";
  changed?: boolean;
};

export const TIMELINE: TimelineItem[] = [
  {
    time: "09:30",
    title: "성산일출봉",
    tag: "실외",
    meta: "입장 5,000원 · 90분",
    travel: "대중교통 24분",
    icon: "bus",
  },
  {
    time: "12:00",
    title: "우도 해물짜장",
    tag: "식사",
    meta: "1인 15,000원",
    travel: "도보 8분",
    icon: "walk",
  },
  {
    time: "14:30",
    title: "제주시립미술관",
    tag: "실내",
    meta: "입장 2,000원 · 혼잡도 낮음",
    travel: "비 예보를 피해 실내로 옮겼어요",
    icon: "umbrella",
    changed: true,
  },
];

export const DAY_LABELS = ["도착과 동쪽", "우도와 미술관", "서쪽과 귀가"];
