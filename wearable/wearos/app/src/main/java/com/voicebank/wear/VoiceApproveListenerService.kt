package com.voicebank.wear

import android.content.Intent
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Listens on the Wearable Data Layer for `/voicebank/verify-request`
 * messages sent by the paired phone app when it needs the watch to
 * confirm a sign-in attempt (see mobile/android's phone-side counterpart,
 * which would send via `Wearable.getMessageClient(context).sendMessage(...)`
 * - not yet implemented on the phone app in this pass; this service is
 * the watch-side half of that future wiring).
 *
 * Expected message payload (UTF-8 JSON):
 *   { "challengeId": "...", "phrase": "my voice is my password 4471" }
 *
 * On receipt, launches [VoiceApproveActivity] with the challenge details
 * so the user can approve by tap or by speaking the phrase.
 */
class VoiceApproveListenerService : WearableListenerService() {

    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path != PATH_VERIFY_REQUEST) return

        val json = JSONObject(String(messageEvent.data, Charsets.UTF_8))
        val challengeId = json.optString("challengeId")
        val phrase = json.optString("phrase")

        val intent = Intent(this, VoiceApproveActivity::class.java).apply {
            putExtra(VoiceApproveActivity.EXTRA_NODE_ID, messageEvent.sourceNodeId)
            putExtra(VoiceApproveActivity.EXTRA_CHALLENGE_ID, challengeId)
            putExtra(VoiceApproveActivity.EXTRA_PHRASE, phrase)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    companion object {
        const val PATH_VERIFY_REQUEST = "/voicebank/verify-request"
    }
}
