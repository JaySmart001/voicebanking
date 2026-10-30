# VoiceBank - Web

Next.js (App Router, TypeScript, Tailwind) client for the VoiceBank demo.

## Run locally

From the repo root (needed so the `@voicebanking/shared` workspace package links correctly):

```bash
npm install
npm run build --workspace shared
cp web/.env.local.example web/.env.local   # adjust NEXT_PUBLIC_API_URL if needed
npm run dev --workspace web
```

Requires the backend (`../server`) running, by default on `http://localhost:4000`.

## Pages

- `/` - landing page and project disclaimer
- `/enroll` - record 3 passphrase samples to build a voiceprint
- `/login` - get a random challenge phrase, speak it, verify
- `/dashboard` - mock accounts, transactions, transfers (requires a session token from `/login`)
- `/watch-preview` - static mockup of the smartwatch approval UI (see `/wearable` in the repo root for the real companion app stubs)

## Audio pipeline

Recording uses `MediaRecorder` for capture + live level metering, then decodes the blob via
`AudioContext.decodeAudioData` and resamples to 16kHz mono through an `OfflineAudioContext` so the
bytes sent to the server exactly match the contract's PCM16/16kHz/mono format - the same format the
native Android/iOS modules produce. See `lib/audio.ts`.
