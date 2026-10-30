# VoiceBank

A cross-platform **voice-authenticated mobile banking** demo: web app, React
Native mobile app with real native Android (Kotlin) and iOS (Swift) modules,
and a smartwatch companion scaffold (Wear OS + watchOS). Built as a portfolio
project to show full-stack + mobile + native + wearable system design in one
coherent codebase.

> **Honesty up front:** the voice authentication here is demo-grade, not
> bank-grade. It's a real, working, hand-built speaker-verification pipeline
> (DSP, not deep learning) with a challenge/response anti-replay step layered
> on top - good enough to demonstrate the architecture end to end, not good
> enough to protect real money. See [`docs/SECURITY.md`](docs/SECURITY.md)
> for exactly what that means and [`docs/ROADMAP.md`](docs/ROADMAP.md) for
> what it would take to close the gap.

## What's here

| Path | What it is | Status |
|---|---|---|
| `shared/` | TypeScript contract (types + API client + audio helpers) used by every client | Working |
| `server/` | Express backend: voiceprint engine, JWT sessions, mock bank API | Working |
| `web/` | Next.js client - full enroll/login/dashboard flow in the browser | Working |
| `mobile/` | React Native client mirroring the web flow | TS app typechecks; needs Android Studio/Xcode on your machine to run natively |
| `mobile/android/` | Kotlin native module: `AudioRecord` capture + `BiometricPrompt` | Real source, not build-verified here (no Android SDK in CI sandbox) |
| `mobile/ios/` | Swift native module: `AVAudioEngine` capture + `LocalAuthentication` | Real source, not build-verified here (no Xcode in CI sandbox) |
| `wearable/wearos/` | Kotlin Wear OS companion scaffold (tap-to-approve / speak-to-approve) | Proof-of-concept, not wired end-to-end |
| `wearable/watchos/` | Swift watchOS companion scaffold | Proof-of-concept, not wired end-to-end |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit
together and why one audio format (16kHz mono PCM16) lets a single
server-side voiceprint engine serve every client.

## How voice auth works here

1. **Enroll**: say a fixed passphrase 3 times. The server extracts a
   29-dimension voice embedding (MFCC mean/std) from each sample and stores
   the averaged template.
2. **Login**: the server issues a random, short-lived, single-use challenge
   phrase. You speak it; the client captures audio and (on web, and
   optionally on mobile) a speech-to-text transcript. The server checks
   voice similarity *and* that the right phrase was actually said.
3. **Session**: on success, a short-lived JWT unlocks the mock bank
   dashboard (accounts, transactions, transfers - all fake data).

On mobile, this is additionally gated by the phone's own biometric layer -
`BiometricPrompt` on Android, `LocalAuthentication`/Face ID on iOS - before
the voice flow even starts, which is the "use the smartphone's underlying
auth layer" piece.

## Quick start (web + backend)

```bash
git clone <this-repo-url>
cd voicebanking
npm install
npm run build --workspace shared

# terminal 1
npm run dev:server     # backend on http://localhost:4000

# terminal 2
npm run dev:web         # web app on http://localhost:3000
```

Open `http://localhost:3000`, enroll with your mic, then log in by speaking
the challenge phrase shown on screen.

## Mobile

```bash
cd mobile
npm install
```

The React Native app code typechecks and mirrors the web flow. Running it on
a device/emulator requires generating the native project via
`npx react-native init` (or Expo prebuild) and copying in the provided
`android/` and `ios/` native module source - see
[`mobile/README.md`](mobile/README.md) for exact steps. This isn't runnable
inside a sandbox with no Android SDK / Xcode, which is expected for a mobile
repo - the native Kotlin/Swift source is real and complete, it just needs
your machine's toolchain to build.

## Wearable (Wear OS / watchOS)

Scaffolding only - see [`wearable/README.md`](wearable/README.md) for the
intended tap-to-approve / speak-to-approve architecture and what's left to
wire it up for real.

## Why this exists

Built to show up-to-date, working full-stack + mobile + native system design
in public - web, backend DSP work, React Native, Kotlin, Swift, and wearable
architecture, all speaking one consistent API contract. Open to feedback,
contributions, and paid opportunities to extend it further.

## License

MIT - see [`LICENSE`](LICENSE).
