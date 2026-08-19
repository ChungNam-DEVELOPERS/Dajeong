# Issue #43 웹 비공개 선호 Design QA

## 비교 대상

- source visual truth path: `C:\Users\user\Desktop\이희석\ui\5_나의선호.png`
- desktop implementation screenshot path: `C:\Users\user\AppData\Local\Temp\dajeong-issue-43\preference-desktop-final.png`
- mobile implementation screenshot path: `C:\Users\user\AppData\Local\Temp\dajeong-issue-43\preference-mobile-full-final.png`
- full-view comparison path: `C:\Users\user\AppData\Local\Temp\dajeong-issue-43\preference-full-comparison.png`
- focused form comparison path: `C:\Users\user\AppData\Local\Temp\dajeong-issue-43\preference-comparison.png`

## 정규화와 상태

- 원본은 804 × 1748px이며 2배 밀도 모바일 캡처로 보고 402 × 874 CSS px 기준으로 정규화했다.
- 모바일 구현은 viewport 402 × 874 CSS px, deviceScaleFactor 1에서 전체 페이지 402 × 2190px로 캡처했다.
- 데스크톱 구현은 viewport 1280 × 900 CSS px, deviceScaleFactor 1에서 전체 페이지 1280 × 1544px로 캡처했다.
- 비교 상태는 `ACTIVE` 여행의 멤버가 기존 비공개 선호를 조회한 상태이며, 3명 중 2명이 제출한 현실적인 fixture를 사용했다.
- 원본은 개인 입력만 다루지만 구현은 Issue #43 요구에 따라 멤버별 제출 여부 패널을 추가했다. 다른 멤버의 원본 선호는 fixture와 화면 모두에 포함하지 않았다.

## 전체 화면 비교

- 원본의 따뜻한 크림 배경, 초록 강조색, 노란 잠금 안내, 범위 입력, 선택 칩, 넓은 완료 CTA를 유지했다.
- 웹 우선 제품 구조에 맞게 여행 맥락 hero와 제출 현황을 추가했고, 데스크톱에서는 입력과 현황을 나란히, 402px에서는 한 열로 배치했다.
- 모바일 전체 화면과 정규화한 원본을 한 이미지에 배치해 확인했다. 가로 넘침, 겹침, 잘림, 깨진 줄바꿈은 없었다.
- 원본의 `예산 여유도` 범위 입력은 서버 계약의 정확한 1인 예산 금액을 입력할 수 있도록 숫자 입력으로 의도적으로 바꿨다.

## 집중 영역 비교

- 개인정보 안내, 활동·이동 슬라이더, 카테고리, 최대 2개 우선순위, 저장 CTA를 같은 폭으로 잘라 원본과 한 이미지에서 비교했다.
- 글꼴은 기존 웹의 Pretendard/system fallback을 유지했고, 제목·본문·보조 설명의 계층과 줄 간격이 안정적이다.
- 여백과 모서리, 얕은 그림자는 기존 웹 디자인 시스템에 맞췄다. 모바일에서는 설명과 저장 결과를 포함해 원본보다 길지만 핵심 입력 순서는 같다.
- 별도 래스터 이미지가 필요한 요소는 없으며 잠금, 멤버, 완료, 대기 아이콘은 모두 Heroicons outline 계열을 사용했다.

## 검증한 상호작용과 접근성

- 선택된 우선순위가 2개일 때 세 번째 칩을 눌러도 선택 수가 늘지 않는 것을 확인했다.
- 카테고리 칩 선택, 예산 변경, 저장 요청, 성공 안내와 제출 현황 유지까지 확인했다.
- 로딩 완료 후 의미 있는 콘텐츠, Next.js 오류 오버레이 없음, 브라우저 page error 없음, console error 없음을 확인했다.
- 402px와 1280px에서 axe WCAG 2A/2AA 검사를 실행했고 최종 결과는 위반 0건, 불완전 판정 0건이다.

## 비교 이력

1. 첫 모바일 패스에서 새 화면의 기존 `text-muted`와 `text-brand-strong` 조합이 axe 색상 대비 위반 41개 노드로 보고됐다. 읽기 보조색을 `#6f665a`, 진한 초록을 `#3c713d`, CTA 배경을 `#3c713d`/hover `#315d32`로 조정했다.
2. 수정 후 같은 fixture와 viewport에서 다시 캡처하고 axe를 재실행했다. 모바일과 데스크톱 모두 위반 0건이며, 비교 이미지에서 계층·간격·색상·아이콘·문구에 남은 P0/P1/P2 차이가 없음을 확인했다.

## Findings

- 남아 있는 P0/P1/P2 없음.
- P3: 웹 전용 설명과 제출 현황 때문에 모바일 전체 길이가 원본보다 길다. 웹 MVP의 이해도와 Issue #43 기능 범위를 위한 의도적인 차이로 유지한다.

## Implementation Checklist

- [x] 원본과 구현을 같은 비교 이미지에서 확인
- [x] 데스크톱·402px 반응형 확인
- [x] 저장과 최대 2개 선택 상호작용 확인
- [x] 오류 오버레이·console·page error 확인
- [x] WCAG 2A/2AA 자동 검사 통과

final result: passed
