# VoiceBank - Wearable Companion (proof-of-concept skeleton)

This folder is a **scaffold**, not a finished feature. It demonstrates how
the VoiceBank sign-in flow could extend from the phone to a paired
smartwatch, on both major platforms. Nothing here is wired end-to-end to
the backend yet, and none of it can be built without the platform IDEs
(Android Studio for `wearos/`, Xcode for `watchos/`) plus a paired or
emulated watch - that limitation is expected at this stage.

## The idea

Voice capture on a watch's small, often-covered mic is less reliable than
on a phone. So instead of making the watch *replace* the phone's voice
verification, it acts as a **second, lightweight approval surface**:

1. The phone already has an active `POST /api/auth/verify` challenge in
   flight (see `/Users/mac/voicebanking/server`) for a given `challengeId`
   and `phrase`.
2. The phone pushes that `{ challengeId, phrase }` pair to the paired
   watch over a platform messaging channel.
3. The watch shows an approval screen with two options:
   - **Tap to approve** - fast local confirmation. This is appropriate
     when the phone has already partially authenticated the user (right
     device, right account, watch still on wrist/unlocked) and just needs
     a quick "yes, it's me" - the same trust model as a push-MFA prompt.
   - **Speak the phrase instead** - captures a short, standalone PCM16
     sample on the watch's own mic (same 16kHz mono format as the phone
     app and backend already use) for a *real* re-run of voiceprint
     verification, not just a tap.
4. The watch sends the decision back to the phone, which is the only
   device that actually talks to the backend.

## What's implemented here

### `wearos/` - Wear OS (Kotlin)
Real Gradle project (`settings.gradle.kts`, `build.gradle.kts`,
`app/build.gradle.kts`, manifest with
`<uses-feature android:name="android.hardware.type.watch"/>`) plus:

- `MainActivity.kt` - idle/launcher screen.
- `VoiceApproveListenerService.kt` - a `WearableListenerService` that
  listens for `/voicebank/verify-request` messages via the **Wearable
  Data Layer API** (`com.google.android.gms.wearable`, declared through
  `play-services-wearable` in `app/build.gradle.kts`) and launches the
  approval screen.
- `VoiceApproveActivity.kt` - the approval UI (Approve button + voice
  fallback), sending the reply back via `MessageClient` on path
  `/voicebank/verify-response`.
- `PcmRecorder.kt` - mono 16kHz PCM16 capture via `AudioRecord`, mirroring
  the phone app's recorder so the bytes need no transcoding downstream.

### `watchos/` - watchOS (Swift)
Swift source only - **no `.xcodeproj`**. Hand-crafting Xcode's binary
`project.pbxproj` format reliably without Xcode itself is impractical and
error-prone; the correct way to use these files is to create a new
watchOS App target in Xcode and drop them in. Files:

- `PhoneSessionHandler.swift` - `WCSessionDelegate` that receives the
  request dictionary (`challengeId`, `phrase`) pushed from the iPhone over
  **WatchConnectivity**, publishes it to SwiftUI, and sends the approval
  decision back.
- `ApproveLoginView.swift` - the approval UI, mirroring the Wear OS
  activity.
- `WatchPcmRecorder.swift` - mono 16kHz PCM16 capture via `AVAudioEngine`
  + `AVAudioConverter`, matching the same wire format.

## What's NOT implemented yet (the real next steps)

1. **Phone → watch send.** Neither `mobile/android` nor `mobile/ios` (the
   phone app, built separately - see `/Users/mac/voicebanking/mobile`)
   currently pushes a request to the watch. That would mean:
   - Android phone side: `Wearable.getMessageClient(context).sendMessage(nodeId, "/voicebank/verify-request", payload)`
     after the phone obtains a challenge from `POST /api/auth/challenge`.
   - iOS phone side: `WCSession.default.sendMessage(["challengeId":...,"phrase":...], ...)`.
2. **Watch → phone → backend relay.** The watch's reply (tap or voice
   sample) currently has nowhere to land on the phone. The phone app would
   need a listener symmetric to `VoiceApproveListenerService` /
   `PhoneSessionHandler`, which then calls the already-implemented
   `POST /api/auth/verify` with either:
   - `{ username, challengeId, sample: <phone's own fallback sample> }` if
     the watch only sent a tap approval (tap alone isn't enough to satisfy
     the backend's voiceprint check - it would need a policy decision on
     how much a tap is trusted to shortcut re-verification), or
   - `{ username, challengeId, sample: <watch-captured sample> }`, forwarding
     the watch's PCM bytes unchanged, since they're already in the
     contract's format.
3. **Pairing/discovery.** Both snippets above assume a known paired
   node/session already exists - standard for watch companion apps, but
   not addressed here.
4. **Build tooling.** `wearos/` should open directly in Android Studio.
   `watchos/` needs a wrapping Xcode project created manually (New Project
   → Watch App) with these three files added to its target.
