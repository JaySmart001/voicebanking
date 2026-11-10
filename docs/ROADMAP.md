# Roadmap

Rough order of what would turn this from a demo into something closer to
production:

1. **Real speaker-embedding model** - swap the hand-rolled MFCC/cosine
   pipeline in `server/` for a trained neural embedding (e.g. a pretrained
   x-vector/ECAPA-TDNN model) behind the same `/api/auth/verify` contract,
   or integrate a vendor (Azure Speaker Recognition, Pindrop, ID R&D).
   Because the contract in `shared/` is already fixed, no client changes
   should be required.
2. **Liveness/anti-spoofing** - detect replayed recordings and synthetic
   (TTS/voice-cloned) audio.
3. **Persistent, proper storage** - replace `server/data/db.json` with a real
   database; encrypt voiceprint templates at rest; add key management.
4. **Harden the mobile native layer** - wire the Android/iOS native modules
   into an actual buildable RN project (`react-native init` or Expo
   prebuild), add Keychain/Keystore-backed secure storage for session
   tokens, add certificate pinning for API calls.
5. **Finish the wearable loop** - wire `wearable/wearos` and
   `wearable/watchos` to actually relay approvals to the phone and from the
   phone to `/api/auth/verify`, including a tap-to-approve path and a
   watch-captured voice sample path.
6. **Rate limiting, anomaly detection, audit logging** on the backend.
   - [x] Rate limiting on `/api/auth/challenge`, `/enroll`, and `/verify`
     (per-IP, plus per-account on `/verify`) via `express-rate-limit`,
     returning 429 with a clear JSON error.
   - [x] Structured audit logging for enroll, verify, and transfer attempts
     (pass and fail) - timestamp, user id, action, result, IP; never raw
     audio, voiceprints, or tokens. See `server/src/audit/log.ts`.
   - [ ] Anomaly detection - not started.
7. **Accessibility fallback** - a non-voice path (PIN/passkey) for users who
   can't or don't want to use voice auth, required for any real product.
8. **Security review** before any of this goes near real accounts or money.
