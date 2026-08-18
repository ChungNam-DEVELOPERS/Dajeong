/**
 * 다정의 의미 기반 색상 토큰입니다.
 * 웹 CSS와 React Native 스타일 양쪽에서 같은 의도로 사용합니다.
 */
export const colors = {
  action: {
    primary: "#5B9F5A",
    primaryPressed: "#4C8B4D",
  },
  surface: {
    canvas: "#FFFDF8",
    raised: "#FFFFFF",
    subtle: "#F7F2E9",
  },
  text: {
    primary: "#332F2A",
    secondary: "#82796D",
    onAction: "#FFFFFF",
  },
  accent: {
    highlight: "#FFD65C",
    warm: "#FFE8C4",
  },
  border: {
    subtle: "#E8E0D4",
  },
  status: {
    danger: "#D95D4F",
  },
} as const;

/** 숫자는 웹에서는 px, React Native에서는 density-independent pixel로 해석합니다. */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type ColorTokens = typeof colors;
export type SpacingToken = keyof typeof spacing;
