# Architecture

VoiceBank is a monorepo split into independently runnable pieces that all speak
the same contract, defined once in `shared/` and consumed everywhere else.

```
voicebanking/
├── shared/      TypeScript types, API client, PCM/base64 helpers - the single
│                source of truth for the contract between every client and
│                the backend. No platform-specific code lives here.
├── server/      Node/Express backend: the voiceprint (speaker verification)
│                engine, JWT session issuance, and a mocked bank API
│                (accounts, transactions, transfers) backed by a JSON file.
├── web/         Next.js client. Full voice-auth flow in the browser using
│                MediaRecorder + Web Audio API for capture/resampling and the
│                Web Speech API for a transcript-based second factor.
├── mobile/      React Native client mirroring the web flow, plus the native
│                bridge to each OS's own audio + biometric layer:
│   ├── android/   Kotlin native module - AudioRecord for capture,
│   │              androidx.biometric.BiometricPrompt for the device's own
│   │              fingerprint/face unlock (Google's biometric layer).
│   └── ios/       Swift native module - AVAudioEngine for capture,
│                  LocalAuthentication/LAContext for Face ID/Touch ID
│                  (Apple's biometric layer).
└── wearable/    Smartwatch companion scaffolding - proof-of-concept, not
                 wired end-to-end yet:
    ├── wearos/    Kotlin, Wearable Data Layer API (tap-to-approve or
    │              speak-to-approve from the wrist).
    └── watchos/   Swift, WatchConnectivity, same approve flow.
```

## Why one voiceprint engine, many clients

Every client - web, phone, eventually watch - captures audio, converts it to
**mono 16-bit PCM at 16kHz**, and base64-encodes it. That one normalized
format means the speaker-verification DSP pipeline only has to be written
once, in `server/`. The browser does this with `AudioContext` /
`OfflineAudioContext` resampling; the phone does it natively with
`AudioRecord` (Android) or `AVAudioEngine` (iOS). See `shared/src/pcm.ts` for
the base64/PCM16 conversion helpers both the web app and the native bridge
JS layer use.

## Auth flow

1. Client requests a **challenge**: a short random phrase + challenge ID,
   valid for 60 seconds, single-use.
2. User speaks the phrase. Client captures PCM audio and (where available)
   a speech-to-text transcript.
3. Client sends `{ challengeId, sample, transcript }` to `/api/auth/verify`.
4. Server re-derives a voice embedding from the sample, compares it against
   the user's enrolled template via cosine similarity, and - if a transcript
   was provided - fuzzy-checks it against the issued phrase as a second,
   anti-replay factor.
5. On success, the server issues a short-lived JWT used for the mock bank
   endpoints.

## Smartwatch expansion path

The watch never needs its own voiceprint engine. The intended end state:
the phone (which already has an authenticated session) relays a verification
request to the paired watch over the Wearable Data Layer API / WatchConnectivity;
the watch either taps "Approve" (fast local confirmation riding on the
phone's session) or records its own short sample and relays it back through
the same `/api/auth/verify` endpoint everything else already uses. See
`wearable/README.md` for the current state of that scaffolding.
