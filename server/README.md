# @voicebanking/server

Backend API for the VoiceBank demo: voiceprint enrollment/verification, challenge-based anti-replay, JWT sessions, and a mock banking API (accounts, transactions, transfers).

## Run it

```bash
# from the repo root (so the npm workspace links @voicebanking/shared correctly)
npm install
npm run build --workspace shared
npm run dev --workspace server
```

The server listens on `http://localhost:4000` by default. Copy `.env.example` to `.env` and set `JWT_SECRET` to anything long and random for local dev; without it, the server runs with a warning and an insecure fallback secret.

Data (users, voiceprints, mock accounts/transactions) is persisted to `server/data/db.json`, a plain JSON file created on first run. Delete it to reset the demo to a clean slate.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | - | Liveness check |
| POST | `/api/auth/challenge` | - | Issues a random, single-use phrase + 60s-expiry challenge |
| POST | `/api/auth/enroll` | - | Registers a user from ≥3 voice samples, seeds mock accounts |
| POST | `/api/auth/verify` | - | Verifies a voice sample against a challenge, returns a 15-min JWT on success |
| GET | `/api/bank/accounts` | Bearer | List the authenticated user's accounts |
| GET | `/api/bank/transactions?accountId=` | Bearer | List transactions, optionally filtered to one account |
| POST | `/api/bank/transfer` | Bearer | Move money between the user's own accounts |

See `@voicebanking/shared`'s `src/types.ts` for exact request/response shapes - the server and every client (web, mobile) import from that one file, so they can't drift out of sync.

## How the voiceprint pipeline works

1. **Pre-emphasis** boosts high frequencies that speech naturally attenuates.
2. **Framing**: the signal is split into 25ms windows every 10ms, each tapered with a **Hamming window**.
3. **FFT** (via `fft.js`) turns each frame into a power spectrum.
4. A **26-band mel filterbank** (0–8kHz) condenses that spectrum into perceptually-spaced energies; a **log + DCT-II** turns those into 13 **MFCCs** per frame - the classic speech-feature pipeline used throughout speech processing.
5. Per clip, we take the **mean and standard deviation** of each MFCC across all frames, giving a fixed-length 26-dimensional, L2-normalized **embedding** regardless of how long the clip is.
6. **Enrollment** averages the embeddings of ≥3 sample recordings into one template per user.
7. **Verification** computes **cosine similarity** between a live embedding and the stored template; a score ≥ `MATCH_THRESHOLD` (0.82, see `src/voiceprint/embedding.ts`) is a match.
8. A random **challenge phrase + 4-digit code**, single-use and 60s-expiry, prevents replaying a captured request. If the client also sends a speech-to-text `transcript`, the server fuzzy-checks it said the right phrase - a second factor on top of the voiceprint match.

## Security disclaimer - please read

This is a **hand-rolled, classical-DSP speaker-verification demo**, built to show the full voice-auth pipeline end to end (capture → features → matching → session issuance → protected API). It is **not** equivalent to production voice biometrics:

- No neural speaker-embedding model (real systems use d-vectors/x-vectors trained on large speaker populations).
- No dedicated anti-spoofing or liveness detection - a sufficiently good recording of the enrolled user's voice could pass. The random challenge phrase mitigates *naive* replay of a captured network request, not a determined attacker with a recording of the target saying arbitrary words.
- Mock data, no real money, no real bank integration.

See `docs/SECURITY.md` in the repo root for the full picture and what a production-grade version would need (real vendor SDK, device-backed liveness, proper threat model).

## Tests

```bash
npm run test --workspace server
```

Covers: embedding determinism, cosine-similarity sanity checks, and an enroll→verify round trip using synthetic tone "voices" (same synthetic speaker matches, a clearly different one doesn't) - a sanity check on the pipeline wiring, not a rigorous biometric accuracy evaluation.
