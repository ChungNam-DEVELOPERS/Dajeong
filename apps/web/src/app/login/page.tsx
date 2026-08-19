import type { Metadata } from "next";
import Link from "next/link";

import { normalizeReturnTo } from "../../auth/cognito";

export const metadata: Metadata = {
  title: "로그인",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, returnTo: returnToValue } = await searchParams;
  const hasError = typeof error === "string" || Array.isArray(error);
  const returnTo = normalizeReturnTo(
    typeof returnToValue === "string" ? returnToValue : undefined,
  );
  const loginUrl = `/api/auth/login?${new URLSearchParams({ returnTo })}`;

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-8">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-panel p-[clamp(var(--space-lg),5vw,var(--space-xxl))] shadow-xl">
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
          Welcome to Dajeong
        </p>
        <h1 className="mt-3 text-[clamp(2.25rem,8vw,3.5rem)] leading-tight font-black tracking-[-0.05em]">
          다정한 여행을
          <span className="block text-brand">함께 시작해요.</span>
        </h1>
        <p className="mt-5 leading-7 text-muted">
          Cognito의 안전한 로그인 화면에서 사용할 소셜 계정을 선택할 수
          있어요.
        </p>
        {hasError ? (
          <p
            className="mt-5 rounded-2xl border border-[#f0c8c4] bg-[#fff4f2] p-4 text-sm font-bold text-[#a43b35]"
            role="alert"
          >
            로그인을 완료하지 못했습니다. 다시 시도해 주세요.
          </p>
        ) : null}
        <a
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href={loginUrl}
        >
          소셜 로그인 계속하기
        </a>
        <Link
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl font-bold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href="/"
        >
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
