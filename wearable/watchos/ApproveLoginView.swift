import SwiftUI

/// Shown when the paired iPhone sends an approval request over
/// WatchConnectivity (see `PhoneSessionHandler.swift`). Mirrors the Wear OS
/// `VoiceApproveActivity` screen: a fast tap-to-approve path, plus a
/// "speak the phrase instead" fallback that captures a short standalone
/// voice sample on the watch and relays it back to the phone.
struct ApproveLoginView: View {
    let challengeId: String
    let phrase: String
    let onApprove: () -> Void
    let onVoiceSampleCaptured: (Data) -> Void

    @StateObject private var recorder = WatchPcmRecorder()
    @State private var isRecording = false

    var body: some View {
        VStack(spacing: 10) {
            Text("Sign-in request")
                .font(.headline)

            Text("Phrase: \"\(phrase)\"")
                .font(.caption)
                .multilineTextAlignment(.center)

            Button(action: onApprove) {
                Text("Approve")
                    .frame(maxWidth: .infinity)
            }
            .tint(.green)

            Button(action: startVoiceFallback) {
                Text(isRecording ? "Listening…" : "Speak phrase instead")
                    .frame(maxWidth: .infinity)
            }
            .disabled(isRecording)
        }
        .padding()
    }

    private func startVoiceFallback() {
        isRecording = true
        // Fixed ~2.5s capture window for this proof-of-concept skeleton;
        // a production build would let the user stop early.
        recorder.start()
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            let pcmData = recorder.stop()
            isRecording = false
            onVoiceSampleCaptured(pcmData)
        }
    }
}
