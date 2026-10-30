# VoiceBank Mobile (React Native)

Mirrors the web app's enroll / voice-login / dashboard flow, but backed by
real native modules instead of browser APIs:

| Concern | Web | Mobile (this app) |
|---|---|---|
| Voice capture | MediaRecorder + Web Audio API | `android/.../voiceauth/VoiceAuthModule.kt` (AudioRecord) / `ios/VoiceBankMobile/VoiceAuthModule.swift` (AVAudioEngine) |
| Device-level biometric pre-check | - (no OS-level biometric API on web) | Android `androidx.biometric.BiometricPrompt` / iOS `LocalAuthentication.LAContext` |
| Backend contract | `@voicebanking/shared` `VoiceBankApiClient` | same `@voicebanking/shared` package, via `file:../shared` |

Both native modules produce mono 16-bit PCM at 16kHz, the exact format the
backend's voiceprint engine expects - see `shared/src/types.ts`.

## Why plain React Native, not Expo Go

This app ships custom native modules (`VoiceAuthModule`). Expo Go is a
pre-built binary that can't load arbitrary native code, so it can't run
this app. It would work with an Expo **development build** (`expo
prebuild` + `expo run:android` / `expo run:ios`) if you'd rather stay on
the Expo toolchain, but the native source here is written as plain RN
modules so it's usable either way.

## Running it

This app was **not built or run inside this sandbox** - there's no
Android SDK or Xcode here. To actually run it:

```bash
cd mobile
npm install
```

### Android

Requires Android Studio (for the SDK) and a device/emulator.

```bash
npm run android
```

The app points at `http://10.0.2.2:4000` by default (the Android
emulator's alias for the host machine's `localhost`). On a physical
device, edit `src/api.ts` to use your machine's LAN IP instead.

### iOS

Requires a Mac with Xcode. The Swift source in `mobile/ios/VoiceBankMobile`
is **not** wrapped in a hand-crafted `.xcodeproj` - generating a correct
Xcode project file by hand is unreliable. Instead:

1. Generate the project shell: `npx react-native init` (or `npx pod-install`
   after scaffolding) creates a real `.xcodeproj`/`Podfile`.
2. Drop `VoiceAuthModule.swift` and `VoiceAuthModule.m` into that generated
   iOS project in Xcode (Xcode will offer to create the Objective-C
   bridging header automatically the first time you add a Swift file -
   accept that prompt).
3. Add these keys to `Info.plist`:
   - `NSMicrophoneUsageDescription` - "VoiceBank needs your microphone to verify your voice."
   - `NSFaceIDUsageDescription` - "VoiceBank uses Face ID as an additional sign-in check."
4. `cd ios && pod install`
5. `npm run ios`

## Native module API

```ts
VoiceAuthModule.requestPermissions(): Promise<boolean>
VoiceAuthModule.startRecording(): Promise<void>
VoiceAuthModule.stopRecording(): Promise<{ base64Pcm: string; durationMs: number }>
VoiceAuthModule.authenticateWithDeviceBiometrics(reason: string): Promise<boolean>
```

See `src/native/VoiceAuthModule.ts` for the JS-side wrapper, and the
module-level doc comments in the Kotlin/Swift sources for why each
platform's implementation is shaped the way it is.

## Typechecking (works without any SDK)

```bash
npm install
npm run typecheck
```
