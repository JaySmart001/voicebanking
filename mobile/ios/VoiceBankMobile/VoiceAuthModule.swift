import AVFoundation
import LocalAuthentication
import React

/// Native voice-capture + device-biometric bridge for iOS.
///
/// Voice capture uses AVAudioEngine with an AVAudioConverter tap so the
/// mic's native format (typically 44.1kHz/48kHz Float32) is downmixed and
/// resampled to the 16kHz mono PCM16 format the backend's voiceprint
/// engine expects - the same wire format the Android module and the web
/// client (via Web Audio API resampling) produce.
///
/// The biometric check uses LocalAuthentication's LAContext, which is
/// iOS's own system-level biometric layer (Face ID / Touch ID backed by
/// the Secure Enclave) - the "underlying auth layer of the smartphone"
/// referenced in the project brief, used as a local factor layered in
/// front of the server-side voiceprint check.
@objc(VoiceAuthModule)
class VoiceAuthModule: NSObject {

  private let targetSampleRate: Double = 16000
  private let audioEngine = AVAudioEngine()
  private var converter: AVAudioConverter?
  private var pcmData = Data()
  private var recordingStartedAt: Date?
  private var isRecording = false

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Permissions

  @objc(requestPermissions:rejecter:)
  func requestPermissions(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in
      resolve(granted)
    }
  }

  // MARK: - Recording

  @objc(startRecording:rejecter:)
  func startRecording(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if isRecording {
      reject("ALREADY_RECORDING", "A recording is already in progress", nil)
      return
    }

    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.record, mode: .measurement, options: [])
      try session.setActive(true)

      let inputNode = audioEngine.inputNode
      let inputFormat = inputNode.outputFormat(forBus: 0)
      guard let targetFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: targetSampleRate,
        channels: 1,
        interleaved: true
      ) else {
        reject("FORMAT_ERROR", "Could not construct target PCM format", nil)
        return
      }

      guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
        reject("FORMAT_ERROR", "Could not construct audio converter", nil)
        return
      }
      self.converter = converter

      pcmData.removeAll()

      inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
        guard let self = self else { return }

        let outputFrameCapacity = AVAudioFrameCount(
          Double(buffer.frameLength) * (self.targetSampleRate / inputFormat.sampleRate) + 16
        )
        guard let outputBuffer = AVAudioPCMBuffer(
          pcmFormat: targetFormat,
          frameCapacity: outputFrameCapacity
        ) else { return }

        var error: NSError?
        let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
          outStatus.pointee = .haveData
          return buffer
        }
        converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)

        if error == nil, let channelData = outputBuffer.int16ChannelData {
          let frameLength = Int(outputBuffer.frameLength)
          let bytes = Data(
            bytes: channelData[0],
            count: frameLength * MemoryLayout<Int16>.size
          )
          self.pcmData.append(bytes)
        }
      }

      audioEngine.prepare()
      try audioEngine.start()
      isRecording = true
      recordingStartedAt = Date()
      resolve(nil)
    } catch {
      reject("START_RECORDING_FAILED", error.localizedDescription, error)
    }
  }

  @objc(stopRecording:rejecter:)
  func stopRecording(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard isRecording else {
      reject("NOT_RECORDING", "No recording in progress", nil)
      return
    }

    audioEngine.inputNode.removeTap(onBus: 0)
    audioEngine.stop()
    isRecording = false

    let durationMs = recordingStartedAt.map { Date().timeIntervalSince($0) * 1000 } ?? 0
    let base64Pcm = pcmData.base64EncodedString()

    resolve([
      "base64Pcm": base64Pcm,
      "durationMs": durationMs,
    ])
  }

  // MARK: - Device biometrics

  @objc(authenticateWithDeviceBiometrics:resolver:rejecter:)
  func authenticateWithDeviceBiometrics(
    reason: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      reject("BIOMETRICS_UNAVAILABLE", error?.localizedDescription ?? "Biometrics unavailable", error)
      return
    }

    context.evaluatePolicy(
      .deviceOwnerAuthenticationWithBiometrics,
      localizedReason: reason
    ) { success, evalError in
      if success {
        resolve(true)
      } else {
        resolve(false)
      }
    }
  }
}
