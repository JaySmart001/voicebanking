# Security notes & disclaimers

**This is a portfolio/demo project. It is not a production banking system and
its voice authentication is not bank-grade biometric security.** If you're
evaluating this repo for a job, contract, or paid opportunity, please read
this page - the honesty here is intentional and is part of the point.

## What the voiceprint engine actually does

`server/` implements speaker verification from scratch: pre-emphasis →
framing/windowing → FFT → mel filterbank → DCT → MFCCs → mean/std pooling
into a fixed-length embedding → cosine similarity against an enrolled
template. This is a real, working, classic DSP pipeline - the kind of thing
speaker recognition looked like before deep learning. It is **not** what
production systems use today.

Production-grade speaker verification uses neural embeddings (d-vectors,
x-vectors, or similar) trained on massive multi-speaker datasets, plus
dedicated anti-spoofing/liveness detection (to catch replayed recordings,
synthetic voice, etc.). None of that is implemented here. A sufficiently
motivated attacker with a recording of the enrolled user's voice could
plausibly defeat this demo's matching step.

## Mitigations that *are* in place

- **Challenge/response anti-replay**: every login requires speaking a fresh,
  random, short-lived, single-use phrase - a bare recording of a past
  session doesn't contain the current phrase.
- **Optional transcript cross-check**: when the client supplies a
  speech-to-text transcript, the server verifies the right words were
  actually said, not just that *some* voice matched.
- **Short-lived JWTs** (15 minutes) for the mock bank session.
- **Device-level biometric gating on mobile**: the native modules can
  require Face ID/Touch ID or Android's BiometricPrompt as an additional,
  OS-enforced local factor before the voice flow even starts.

## What would be needed for this to be real

See `docs/ROADMAP.md`. In short: a trained speaker-embedding model, liveness/
anti-spoofing, encrypted voiceprint storage with proper key management, rate
limiting and anomaly detection, a real database instead of a JSON file, and
a security audit - before this should touch real money or real accounts.

## Responsible use

Don't point this at real bank accounts, real user credentials, or deploy it
as-is for anyone's actual financial access. It exists to demonstrate system
design across web, mobile, native, and wearable layers.
