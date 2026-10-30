import WatchConnectivity
import SwiftUI
import Combine

/// watchOS-side WatchConnectivity (`WCSession`) handler. Receives the
/// verification-request message sent by the paired iPhone app when it
/// needs the watch to confirm a sign-in attempt, and publishes it so a
/// SwiftUI view can present `ApproveLoginView`.
///
/// Expected message payload (sent via `session.sendMessage`):
///   ["challengeId": String, "phrase": String]
///
/// Counterpart on the phone side (not yet implemented in this pass) would
/// live in mobile/ios and use `WCSession.default.sendMessage(...)` to push
/// the request, then receive the reply dictionary back:
///   ["challengeId": String, "mode": "tap" | "voice", "sample": String?]
/// and forward it to POST /api/auth/verify on the backend.
final class PhoneSessionHandler: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = PhoneSessionHandler()

    @Published var pendingChallengeId: String?
    @Published var pendingPhrase: String?

    private override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        // No-op: nothing to do until the phone actually sends a request.
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard
            let challengeId = message["challengeId"] as? String,
            let phrase = message["phrase"] as? String
        else { return }

        DispatchQueue.main.async {
            self.pendingChallengeId = challengeId
            self.pendingPhrase = phrase
        }
    }

    /// Sends the user's approval decision back to the phone.
    func sendApproval(challengeId: String, mode: String, sample: Data?) {
        var payload: [String: Any] = ["challengeId": challengeId, "mode": mode]
        if let sample {
            payload["sample"] = sample.base64EncodedString()
        }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: nil)

        DispatchQueue.main.async {
            self.pendingChallengeId = nil
            self.pendingPhrase = nil
        }
    }
}

/// Root view for the watch app: shows an idle state, or `ApproveLoginView`
/// when `PhoneSessionHandler` has a pending request.
struct VoiceBankWatchRootView: View {
    @ObservedObject private var session = PhoneSessionHandler.shared

    var body: some View {
        if let challengeId = session.pendingChallengeId, let phrase = session.pendingPhrase {
            ApproveLoginView(
                challengeId: challengeId,
                phrase: phrase,
                onApprove: {
                    session.sendApproval(challengeId: challengeId, mode: "tap", sample: nil)
                },
                onVoiceSampleCaptured: { sample in
                    session.sendApproval(challengeId: challengeId, mode: "voice", sample: sample)
                }
            )
        } else {
            VStack {
                Text("VoiceBank")
                    .font(.headline)
                Text("Waiting for a sign-in request from your phone…")
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}
