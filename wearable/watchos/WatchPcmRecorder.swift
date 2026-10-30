import AVFoundation
import Combine

/// Captures mono 16kHz PCM16 audio from the Apple Watch microphone - the
/// same wire format the phone app and backend already speak (see
/// voicebanking/shared/src/types.ts: AUDIO_SAMPLE_RATE / AUDIO_BITS_PER_SAMPLE).
///
/// Mirrors the iPhone app's `ios/VoiceAuthModule.swift` recorder so the two
/// share one mental model; duplicated here rather than shared as a library
/// because the watch and phone targets are built as independent Xcode
/// projects/targets.
final class WatchPcmRecorder: ObservableObject {
    private var engine: AVAudioEngine?
    private var collected = Data()

    func start() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.record, mode: .measurement)
        try? session.setActive(true)

        let engine = AVAudioEngine()
        self.engine = engine
        collected = Data()

        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16_000,
            channels: 1,
            interleaved: true
        ) else { return }

        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else { return }

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
            guard let self else { return }
            let outputCapacity = AVAudioFrameCount(targetFormat.sampleRate * Double(buffer.frameLength) / inputFormat.sampleRate) + 16
            guard let outBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outputCapacity) else { return }

            var error: NSError?
            let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
                outStatus.pointee = .haveData
                return buffer
            }
            converter.convert(to: outBuffer, error: &error, withInputFrom: inputBlock)
            guard error == nil, let channelData = outBuffer.int16ChannelData else { return }

            let frameCount = Int(outBuffer.frameLength)
            let bytes = Data(bytes: channelData[0], count: frameCount * MemoryLayout<Int16>.size)
            self.collected.append(bytes)
        }

        try? engine.start()
    }

    /// Stops recording and returns the captured samples as raw PCM16 bytes.
    func stop() -> Data {
        engine?.inputNode.removeTap(onBus: 0)
        engine?.stop()
        engine = nil
        return collected
    }
}
