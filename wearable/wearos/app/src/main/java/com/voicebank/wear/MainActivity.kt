package com.voicebank.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.MaterialTheme

/**
 * Idle-state entry point for the watch app. In normal operation the user
 * never has to open this screen directly - [VoiceApproveListenerService]
 * launches [VoiceApproveActivity] straight from a phone-initiated message.
 * This activity exists so the app has a launcher icon and a resting state
 * that explains that it's waiting for a sign-in request.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            IdleScreen()
        }
    }
}

@Composable
fun IdleScreen() {
    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "VoiceBank\n\nWaiting for a sign-in request from your phone…",
                textAlign = TextAlign.Center
            )
        }
    }
}
