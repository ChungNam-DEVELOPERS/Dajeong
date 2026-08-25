export type Member = {
  name: string;
  color: "peach" | "sage" | "yellow" | "cream";
  status: "방장" | "참여 완료";
};

export const MEMBERS: Member[] = [
  { name: "민지", color: "peach", status: "방장" },
  { name: "현우", color: "sage", status: "참여 완료" },
  { name: "지은", color: "yellow", status: "참여 완료" },
  { name: "시윤", color: "cream", status: "참여 완료" },
];
