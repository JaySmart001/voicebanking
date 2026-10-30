package com.voicebanking.mobile.voiceauth

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.io.ByteArrayOutputStream

/**
 * Native voice-capture + device-biometric bridge for Android.
 *
 * Voice capture uses android.media.AudioRecord directly (not
 * MediaRecorder's compressed output) because the backend's voiceprint
 * engine (server/src/voiceprint) needs raw 16kHz mono PCM16 samples, not a
 * compressed container format.
 *
 * The biometric check uses androidx.biometric.BiometricPrompt, which is
 * Android's own system-level biometric layer (fingerprint / face unlock
 * via Trusted Execution Environment / Secure Enclave-equivalent hardware)
 * - this is the "underlying auth layer of the smartphone" referenced in
 * the project brief, used here as a local factor layered in front of the
 * server-side voiceprint check.
 */
class VoiceAuthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val RECORD_AUDIO_PERMISSION_REQUEST_CODE = 7421
    }

    override fun getName() = "VoiceAuthModule"

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private var recordingStartedAt: Long = 0L
    private val pcmBuffer = ByteArrayOutputStream()
    @Volatile private var isRecording = false

    // ---- Permissions -------------------------------------------------

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        val activity = reactContext.currentActivity
        val alreadyGranted = ContextCompat.checkSelfPermission(
            reactContext, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (alreadyGranted) {
            promise.resolve(true)
            return
        }

        if (activity !is PermissionAwareActivity) {
            promise.reject("NO_ACTIVITY", "No activity available to request permissions")
            return
        }

        val listener = PermissionListener { requestCode, _, grantResults ->
            if (requestCode == RECORD_AUDIO_PERMISSION_REQUEST_CODE) {
                val granted = grantResults.isNotEmpty() &&
                    grantResults[0] == PackageManager.PERMISSION_GRANTED
                promise.resolve(granted)
                true
            } else {
                false
            }
        }

        activity.requestPermissions(
            arrayOf(Manifest.permission.RECORD_AUDIO),
            RECORD_AUDIO_PERMISSION_REQUEST_CODE,
            listener
        )
    }

    // ---- Recording -----------------------------------------------------

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "A recording is already in progress")
            return
        }

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (minBufferSize <= 0) {
            promise.reject("UNSUPPORTED", "Device does not support the requested audio format")
            return
        }

        try {
            val record = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                minBufferSize * 4
            )

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject("INIT_FAILED", "AudioRecord failed to initialize")
                return
            }

            pcmBuffer.reset()
            audioRecord = record
            isRecording = true
            recordingStartedAt = System.currentTimeMillis()
            record.startRecording()

            recordingThread = Thread {
                val chunk = ByteArray(minBufferSize)
                while (isRecording) {
                    val read = record.read(chunk, 0, chunk.size)
                    if (read > 0) {
                        synchronized(pcmBuffer) {
                            pcmBuffer.write(chunk, 0, read)
                        }
                    }
                }
            }.also { it.start() }

            promise.resolve(null)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "RECORD_AUDIO permission not granted", e)
        } catch (e: Exception) {
            promise.reject("START_RECORDING_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        val record = audioRecord
        if (!isRecording || record == null) {
            promise.reject("NOT_RECORDING", "No recording in progress")
            return
        }

        isRecording = false
        recordingThread?.join(1000)
        recordingThread = null

        try {
            record.stop()
        } catch (e: Exception) {
            // AudioRecord.stop() can throw if called in an invalid state;
            // the recorded buffer up to this point is still usable.
        }
        record.release()
        audioRecord = null

        val durationMs = System.currentTimeMillis() - recordingStartedAt
        val pcmBytes = synchronized(pcmBuffer) { pcmBuffer.toByteArray() }
        val base64Pcm = Base64.encodeToString(pcmBytes, Base64.NO_WRAP)

        val result: WritableMap = Arguments.createMap().apply {
            putString("base64Pcm", base64Pcm)
            putDouble("durationMs", durationMs.toDouble())
        }
        promise.resolve(result)
    }

    // ---- Device biometrics --------------------------------------------

    @ReactMethod
    fun authenticateWithDeviceBiometrics(reason: String, promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity !is FragmentActivity) {
            promise.reject("NO_ACTIVITY", "Biometric prompt requires a FragmentActivity")
            return
        }

        val biometricManager = BiometricManager.from(reactContext)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
        )
        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            // No biometrics enrolled on this device - not a hard failure for
            // this demo, the caller decides whether to treat it as a skip.
            promise.reject("BIOMETRICS_UNAVAILABLE", "No biometrics enrolled on this device")
            return
        }

        activity.runOnUiThread {
            val executor = ContextCompat.getMainExecutor(reactContext)
            val prompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        promise.resolve(true)
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        promise.resolve(false)
                    }

                    override fun onAuthenticationFailed() {
                        // A single failed attempt; the prompt stays open for
                        // retries, so we don't resolve the promise here.
                    }
                }
            )

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("VoiceBank")
                .setSubtitle(reason)
                .setNegativeButtonText("Cancel")
                .build()

            prompt.authenticate(promptInfo)
        }
    }
}
