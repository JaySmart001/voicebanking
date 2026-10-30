package com.voicebank.wear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import android.util.Base64
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable

/**
 * Shown when the phone sends a `/voicebank/verify-request` Data Layer
 * message (see VoiceApproveListenerService). Offers two ways to approve:
 *
 * 1. Tap-to-approve - a fast local confirmation. This only makes sense
 *    when the phone has already partially authenticated the user (e.g.
 *    the right account is unlocked and nearby) and just wants a quick
 *    "yes, it's really me" tap, analogous to approving a push MFA prompt.
 *
 * 2. Speak the phrase - captures a standalone voice sample on the watch's
 *    own mic and relays it back to the phone, which forwards it untouched
 *    to POST /api/auth/verify. This is the stronger factor since it
 *    reruns actual voiceprint verification, not just a tap.
 *
 * Both paths send a reply message back over the Data Layer; the phone is
 * responsible for actually calling the backend and showing the result.
 */
class VoiceApproveActivity : ComponentActivity() {

    private val messageClient: MessageClient by lazy { Wearable.getMessageClient(this) }
    private val recorder = PcmRecorder()
    private lateinit var nodeId: String
    private lateinit var challengeId: String

    private val requestMicPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> if (granted) startVoiceCapture() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nodeId = intent.getStringExtra(EXTRA_NODE_ID) ?: ""
        challengeId = intent.getStringExtra(EXTRA_CHALLENGE_ID) ?: ""
        val phrase = intent.getStringExtra(EXTRA_PHRASE) ?: ""

        setContent {
            ApproveScreen(
                phrase = phrase,
                onApprove = { sendTapApproval() },
                onSpeakInstead = { requestMicAndRecord() }
            )
        }
    }

    private fun requestMicAndRecord() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startVoiceCapture()
        } else {
            requestMicPermission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startVoiceCapture() {
        recorder.start()
        // In the full implementation this is wired to a Compose timer / a
        // "stop" button; for this proof-of-concept skeleton we record a
        // fixed ~2.5s window, enough for a short challenge phrase.
        android.os.Handler(mainLooper).postDelayed({
            val pcmBytes = recorder.stop()
            sendVoiceApproval(pcmBytes)
        }, 2500)
    }

    private fun sendTapApproval() {
        val payload = "{\"challengeId\":\"$challengeId\",\"mode\":\"tap\"}".toByteArray()
        messageClient.sendMessage(nodeId, PATH_VERIFY_RESPONSE, payload)
        finish()
    }

    private fun sendVoiceApproval(pcmBytes: ByteArray) {
        val sampleB64 = Base64.encodeToString(pcmBytes, Base64.NO_WRAP)
        val payload = "{\"challengeId\":\"$challengeId\",\"mode\":\"voice\",\"sample\":\"$sampleB64\"}"
            .toByteArray()
        messageClient.sendMessage(nodeId, PATH_VERIFY_RESPONSE, payload)
        finish()
    }

    companion object {
        const val EXTRA_NODE_ID = "node_id"
        const val EXTRA_CHALLENGE_ID = "challenge_id"
        const val EXTRA_PHRASE = "phrase"
        const val PATH_VERIFY_RESPONSE = "/voicebank/verify-response"
    }
}

@Composable
private fun ApproveScreen(
    phrase: String,
    onApprove: () -> Unit,
    onSpeakInstead: () -> Unit
) {
    var recording by remember { mutableStateOf(false) }

    MaterialTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(text = "Sign-in request")
            Text(text = "Phrase: \"$phrase\"")

            Button(onClick = onApprove) {
                Text("Approve")
            }

            Button(onClick = {
                recording = true
                onSpeakInstead()
            }) {
                Text(if (recording) "Listening…" else "Speak phrase instead")
            }
        }
    }
}
