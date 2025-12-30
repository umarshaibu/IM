package com.im

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class CallActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallActionReceiver"
        private const val CALL_NOTIFICATION_ID = 9999

        // Store pending decline call ID for when app opens
        var pendingDeclineCallId: String? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received action: ${intent.action}")

        when (intent.action) {
            "ANSWER_CALL" -> {
                val callId = intent.getStringExtra("callId") ?: return
                val callerId = intent.getStringExtra("callerId") ?: ""
                val callerName = intent.getStringExtra("callerName") ?: "Unknown"
                val callType = intent.getStringExtra("callType") ?: "Voice"
                val conversationId = intent.getStringExtra("conversationId") ?: ""

                Log.d(TAG, "Answering call from notification: $callId")

                // Stop ringtone and vibration
                CallNotificationService.stopRingtone()

                // Cancel notification
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(CALL_NOTIFICATION_ID)

                // Close IncomingCallActivity if it's open
                closeIncomingCallActivity(context)

                // Join the call via HTTP API FIRST to get room token
                CallApiClient.joinCall(context, callId) { result ->
                    Log.d(TAG, "Join API call result: success=${result.success}, error=${result.error}")

                    // Launch MainActivity with call data
                    val mainIntent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("type", "call")
                        putExtra("callId", callId)
                        putExtra("callerId", callerId)
                        putExtra("callerName", callerName)
                        putExtra("callType", callType)
                        putExtra("conversationId", conversationId)
                        putExtra("action", "answer")

                        // Include room token if API call was successful
                        if (result.success) {
                            putExtra("roomToken", result.roomToken)
                            putExtra("roomId", result.roomId)
                            putExtra("liveKitUrl", result.liveKitUrl)
                            Log.d(TAG, "Including room token from API: roomId=${result.roomId}")
                        } else {
                            Log.e(TAG, "No room token available, React Native will try to join")
                        }
                    }
                    context.startActivity(mainIntent)
                }
            }
            "DECLINE_CALL" -> {
                val callId = intent.getStringExtra("callId") ?: return
                Log.d(TAG, "Declining call: $callId")

                // Stop ringtone and vibration
                CallNotificationService.stopRingtone()

                // Cancel notification
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(CALL_NOTIFICATION_ID)

                // Close IncomingCallActivity if it's open
                closeIncomingCallActivity(context)

                // Decline the call via HTTP API directly
                // This ensures the backend knows we declined even if React Native isn't loaded
                CallApiClient.declineCall(context, callId) { success, error ->
                    Log.d(TAG, "Decline API call result: success=$success, error=$error")
                }

                // Store the decline call ID - this will be handled when the app opens
                pendingDeclineCallId = callId

                // Try to send decline event to React Native if available
                CallEventModule.sendDeclineEvent(callId)

                Log.d(TAG, "Decline stored for call: $callId")
            }
        }
    }

    private fun closeIncomingCallActivity(context: Context) {
        try {
            // Send broadcast to close IncomingCallActivity
            val closeIntent = Intent("com.im.CLOSE_INCOMING_CALL").apply {
                setPackage(context.packageName)
            }
            context.sendBroadcast(closeIntent)
            Log.d(TAG, "Sent close broadcast to IncomingCallActivity")
        } catch (e: Exception) {
            Log.e(TAG, "Error closing IncomingCallActivity: ${e.message}")
        }
    }
}
