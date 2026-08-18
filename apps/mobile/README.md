# 다정 모바일

Expo SDK 57과 Expo Router를 사용하는 React Native 앱이다. 웹과 색상·간격 토큰은 공유하지만 화면 컴포넌트는 모바일 코드로 분리한다.

## 앱 식별자

- Expo slug: `dajeong`
- deep link scheme: `dajeong://`
- iOS bundle identifier: `com.chungnamdevelopers.dajeong`
- Android application ID: `com.chungnamdevelopers.dajeong`

스토어 등록 전까지 위 bundle/application ID를 후보로 유지하고, 등록 이후에는 기존 설치와 업데이트 호환성을 위해 바꾸지 않는다.

## 실행과 검사

루트 디렉터리에서 실행한다.

```bash
pnpm --filter @dajeong/mobile start
pnpm --filter @dajeong/mobile run lint
pnpm --filter @dajeong/mobile run typecheck
pnpm --filter @dajeong/mobile run export:android
pnpm --filter @dajeong/mobile run export:ios
```

`start` 뒤 Expo Go가 설치된 휴대폰으로 QR 코드를 스캔하면 가장 빠르게 실제 화면을 확인할 수 있다.

## Expo 실행 방식의 차이

- **Expo Go:** 미리 만들어진 Expo 앱 안에서 JavaScript를 실행한다. 시작은 가장 빠르지만 Expo Go에 포함되지 않은 커스텀 네이티브 모듈은 사용할 수 없다.
- **Development build:** 이 프로젝트의 네이티브 설정과 모듈을 포함한 개발용 앱이다. 네이티브 기능을 추가한 뒤 디버깅할 때 사용한다.
- **Production build:** 서명·최적화를 거쳐 스토어 또는 배포 채널에 올리는 설치 파일이다. `expo export`는 JavaScript와 asset 번들 검증이며 APK·AAB·IPA 생성 자체는 아니다.
