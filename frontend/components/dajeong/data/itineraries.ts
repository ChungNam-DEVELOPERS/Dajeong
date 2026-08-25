export type Itinerary = {
  id: "A" | "B" | "C";
  title: string;
  tags: string[];
  travel: string;
  budget: string;
  fatigue: string;
  indoor: string;
};

export const ITINERARIES: Itinerary[] = [
  {
    id: "A",
    title: "여유로운 감성 여행",
    tags: ["여유", "감성", "자연"],
    travel: "1.2h",
    budget: "32,000원",
    fatigue: "낮음",
    indoor: "66%",
  },
  {
    id: "B",
    title: "핫플 & 맛집",
    tags: ["핫플", "맛집", "쇼핑"],
    travel: "2.4h",
    budget: "46,000원",
    fatigue: "보통",
    indoor: "42%",
  },
  {
    id: "C",
    title: "액티비티 가득",
    tags: ["액티비티", "체험", "바다"],
    travel: "2.1h",
    budget: "40,000원",
    fatigue: "높음",
    indoor: "30%",
  },
];
