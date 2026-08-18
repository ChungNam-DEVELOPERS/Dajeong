# 다정 모바일

Expo SDK 57과 Expo Router를 사용하는 React Native 앱이다. 웹과 색상·간격 토큰은 공유하지만 화면 컴포넌트는 모바일 코드로 분리한다.

## 앱 식별자

- Expo slug: `dajeong`
- deep link scheme: `dajeong://`
- iOS bundle identifier: `com.chungnamdevelopers.dajeong`
- Android application ID: `com.chungnamdevelopers.dajeong`

스토어 등록 전까지 위 bundle/application ID를 후보로 유지하고, 등록 이후에는 기존 설치와 업데이트 호환성을 위해 바꾸지 않는다.

## 실행과 검사

루트 디렉터리에서 공개 API URL 예제를 로컬 설정으로 복사한 뒤 실행한다. `EXPO_PUBLIC_*` 값은 앱 번들에 포함되므로 비밀값을 넣지 않는다.

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

실제 기기에서는 `127.0.0.1`이 기기 자신을 가리킨다. `EXPO_PUBLIC_API_BASE_URL`을 개발 장비의 LAN 주소로 바꾸고, Android Emulator에서는 필요하면 `10.0.2.2`를 사용한다.

```bash
pnpm --filter @dajeong/mobile start
pnpm --filter @dajeong/mobile check:env
pnpm --filter @dajeong/mobile run lint
pnpm --filter @dajeong/mobile run typecheck
pnpm --filter @dajeong/mobile run export:android
pnpm --filter @dajeong/mobile run export:ios
```

`start` 뒤 Expo Go가 설치된 휴대폰으로 QR 코드를 스캔하면 가장 빠르게 실제 화면을 확인할 수 있다.

전체 환경 계약과 Staging·Production 주입 위치는 [`docs/10-environment-configuration.md`](../../docs/10-environment-configuration.md)를 따른다.

## Expo 실행 방식의 차이

- **Expo Go:** 미리 만들어진 Expo 앱 안에서 JavaScript를 실행한다. 시작은 가장 빠르지만 Expo Go에 포함되지 않은 커스텀 네이티브 모듈은 사용할 수 없다.
- **Development build:** 이 프로젝트의 네이티브 설정과 모듈을 포함한 개발용 앱이다. 네이티브 기능을 추가한 뒤 디버깅할 때 사용한다.
- **Production build:** 서명·최적화를 거쳐 스토어 또는 배포 채널에 올리는 설치 파일이다. `expo export`는 JavaScript와 asset 번들 검증이며 APK·AAB·IPA 생성 자체는 아니다.
