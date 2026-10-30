package com.voicebank.wear

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.ByteArrayOutputStream

/**
 * Captures mono 16kHz PCM16 audio from the watch's microphone - the same
 * wire format the phone app and backend already speak (see
 * voicebanking/shared/src/types.ts: AUDIO_SAMPLE_RATE / AUDIO_BITS_PER_SAMPLE).
 * This lets a watch-captured sample be relayed to the phone and forwarded
 * to POST /api/auth/verify unchanged.
 *
 * Mirrors the phone's android VoiceAuthModule.kt recorder so the two share
 * one mental model; duplicated here rather than shared as a library because
 * the watch and phone app are built as independent Gradle projects.
 */
class PcmRecorder {
    companion object {
        private const val SAMPLE_RATE = 16_000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private val buffer = ByteArrayOutputStream()
    @Volatile private var isRecording = false

    @SuppressLint("MissingPermission") // Caller must have already requested RECORD_AUDIO.
    fun start() {
        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val record = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            minBufferSize * 4
        )
        audioRecord = record
        buffer.reset()
        isRecording = true
        record.startRecording()

        recordingThread = Thread {
            val chunk = ByteArray(minBufferSize)
            while (isRecording) {
                val read = record.read(chunk, 0, chunk.size)
                if (read > 0) {
                    synchronized(buffer) { buffer.write(chunk, 0, read) }
                }
            }
        }.also { it.start() }
    }

    /** Stops recording and returns the captured samples as raw PCM16 bytes. */
    fun stop(): ByteArray {
        isRecording = false
        recordingThread?.join(500)
        recordingThread = null
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        return synchronized(buffer) { buffer.toByteArray() }
    }
}
