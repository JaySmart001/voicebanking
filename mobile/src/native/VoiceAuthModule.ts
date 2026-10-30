import { NativeModules, Platform } from "react-native";

/**
 * JS-side contract for the native VoiceAuthModule implemented natively per
 * platform: VoiceAuthModule.kt (Android, backed by android.media.AudioRecord
 * + androidx.biometric.BiometricPrompt) and VoiceAuthModule.swift (iOS,
 * backed by AVAudioEngine + LocalAuthentication's LAContext).
 *
 * Both native implementations capture mono 16-bit PCM at 16kHz - the same
 * format the backend's voiceprint engine expects (see
 * @voicebanking/shared's AUDIO_SAMPLE_RATE/AUDIO_CHANNELS/AUDIO_BITS_PER_SAMPLE),
 * so this module is the only platform-specific seam in the whole app.
 */
export interface VoiceAuthNativeModule {
  requestPermissions(): Promise<boolean>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<{ base64Pcm: string; durationMs: number }>;
  authenticateWithDeviceBiometrics(reason: string): Promise<boolean>;
}

const { VoiceAuthModule: NativeVoiceAuthModule } = NativeModules as {
  VoiceAuthModule?: VoiceAuthNativeModule;
};

function notLinked(): never {
  throw new Error(
    `VoiceAuthModule native module is not linked for ${Platform.OS}. ` +
      "This project ships the native Kotlin/Swift source (mobile/android, mobile/ios) " +
      "but requires a real native build (Android Studio / Xcode) to run - " +
      "it cannot execute inside Expo Go or a plain JS environment."
  );
}

/**
 * Safe wrapper so the rest of the app (and any JS-only tooling, like a
 * typecheck or a future unit test) can import this module without crashing
 * at import time when the native side isn't linked yet.
 */
export const VoiceAuthModule: VoiceAuthNativeModule = NativeVoiceAuthModule ?? {
  requestPermissions: async () => notLinked(),
  startRecording: async () => notLinked(),
  stopRecording: async () => notLinked(),
  authenticateWithDeviceBiometrics: async () => notLinked(),
};
