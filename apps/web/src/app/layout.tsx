import { colors, spacing } from "@dajeong/design-tokens";
import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";

import "./globals.css";

type ThemeStyle = CSSProperties & {
  [property: `--${string}`]: string;
};

const themeStyle: ThemeStyle = {
  "--color-accent-highlight": colors.accent.highlight,
  "--color-accent-warm": colors.accent.warm,
  "--color-action-primary": colors.action.primary,
  "--color-action-primary-pressed": colors.action.primaryPressed,
  "--color-border-subtle": colors.border.subtle,
  "--color-surface-canvas": colors.surface.canvas,
  "--color-surface-raised": colors.surface.raised,
  "--color-surface-subtle": colors.surface.subtle,
  "--color-text-on-action": colors.text.onAction,
  "--color-text-primary": colors.text.primary,
  "--color-text-secondary": colors.text.secondary,
  "--space-lg": `${spacing.lg}px`,
  "--space-md": `${spacing.md}px`,
  "--space-sm": `${spacing.sm}px`,
  "--space-xl": `${spacing.xl}px`,
  "--space-xs": `${spacing.xs}px`,
  "--space-xxl": `${spacing.xxl}px`,
};

export const metadata: Metadata = {
  title: {
    default: "다정",
    template: "%s | 다정",
  },
  description: "소중한 사람들과 여행을 계획하고 추억을 나누는 다정입니다.",
};

export const viewport: Viewport = {
  themeColor: colors.surface.canvas,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body style={themeStyle}>{children}</body>
    </html>
  );
}
