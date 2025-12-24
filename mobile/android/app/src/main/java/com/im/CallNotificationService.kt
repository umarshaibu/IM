package com.im

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class CallNotificationService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "CallNotificationService"
        private const val CALL_CHANNEL_ID = "incoming_calls"
        const val CALL_NOTIFICATION_ID = 9999
        private const val RINGTONE_TIMEOUT_MS = 60000L // 60 seconds

        private var ringtone: Ringtone? = null
        private var vibrator: Vibrator? = null
        private var wakeLock: PowerManager.WakeLock? = null
        private var ringtoneHandler: android.os.Handler? = null
        private var ringtoneTimeoutRunnable: Runnable? = null
        private var currentCallId: String? = null

        fun stopRingtone() {
            try {
                // Cancel timeout
                ringtoneTimeoutRunnable?.let { ringtoneHandler?.removeCallbacks(it) }
                ringtoneTimeoutRunnable = null
                ringtoneHandler = null
                currentCallId = null

                ringtone?.stop()
                ringtone = null
                vibrator?.cancel()
                vibrator = null
                wakeLock?.let {
                    if (it.isHeld) it.release()
                }
                wakeLock = null
                Log.d(TAG, "Ringtone and vibration stopped")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping ringtone: ${e.message}")
            }
        }

        fun getCurrentCallId(): String? = currentCallId

        /**
         * Called when a call ends or is cancelled - stops ringtone and closes the incoming call activity
         */
        fun endCall(context: Context, callId: String?) {
            Log.d(TAG, "endCall called for callId: $callId, currentCallId: $currentCallId")

            // Stop ringtone if this is the current call
            if (callId == null || callId == currentCallId) {
                stopRingtone()

                // Cancel notification
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(CALL_NOTIFICATION_ID)

                // Send broadcast to close IncomingCallActivity
                val closeIntent = Intent("com.im.CLOSE_INCOMING_CALL").apply {
                    setPackage(context.packageName)
                }
                context.sendBroadcast(closeIntent)
                Log.d(TAG, "Broadcast sent to close IncomingCallActivity")
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "Message received from: ${remoteMessage.from}")
        Log.d(TAG, "Message data: ${remoteMessage.data}")

        val data = remoteMessage.data
        val type = data["type"]

        when (type) {
            "call" -> {
                Log.d(TAG, "Handling incoming call notification natively")

                val callId = data["callId"] ?: return
                val callerName = data["callerName"] ?: "Unknown"
                val callType = data["callType"] ?: "Voice"
                val callerId = data["callerId"] ?: ""
                val conversationId = data["conversationId"] ?: ""

                // Wake up the device
                wakeDevice()

                // Start playing ringtone (use default phone ringtone for video calls)
                startRingtone(callId, callType)

                // Show full-screen notification
                showCallNotification(callId, callerName, callType, callerId, conversationId)
            }
            "call_ended" -> {
                Log.d(TAG, "Handling call ended notification")
                val callId = data["callId"]
                endCall(applicationContext, callId)
            }
            else -> {
                // Let the JS side handle non-call notifications
                super.onMessageReceived(remoteMessage)
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun wakeDevice() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager

            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "IM:CallWakeLock"
            )
            wakeLock?.acquire(60 * 1000L) // 60 seconds timeout

            Log.d(TAG, "Device wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Error waking device: ${e.message}")
        }
    }

    private fun startRingtone(callId: String, callType: String = "Voice") {
        try {
            // Store current call ID
            currentCallId = callId

            // Use default device ringtone for all call types (voice and video)
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            Log.d(TAG, "Using default ringtone URI: $ringtoneUri for $callType call")

            ringtone = RingtoneManager.getRingtone(applicationContext, ringtoneUri)

            // Set audio attributes for call
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone?.isLooping = true
            }

            // Set volume to max for calls
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_RING)
            audioManager.setStreamVolume(AudioManager.STREAM_RING, maxVolume, 0)

            ringtone?.play()
            Log.d(TAG, "Ringtone started playing for call: $callId (type: $callType)")

            // Start vibration
            startVibration()

            // Set up timeout to stop ringtone after 60 seconds
            ringtoneHandler = android.os.Handler(android.os.Looper.getMainLooper())
            ringtoneTimeoutRunnable = Runnable {
                Log.d(TAG, "Ringtone timeout reached for call: $callId")
                stopRingtone()
                // Cancel the notification too
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(CALL_NOTIFICATION_ID)
            }
            ringtoneHandler?.postDelayed(ringtoneTimeoutRunnable!!, RINGTONE_TIMEOUT_MS)

        } catch (e: Exception) {
            Log.e(TAG, "Error starting ringtone: ${e.message}")
        }
    }

    @Suppress("DEPRECATION")
    private fun startVibration() {
        try {
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            // Vibration pattern: wait 0ms, vibrate 500ms, wait 250ms, repeat
            val pattern = longArrayOf(0, 500, 250, 500, 250, 500, 250, 500)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                vibrator?.vibrate(pattern, 0)
            }

            Log.d(TAG, "Vibration started")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting vibration: ${e.message}")
        }
    }

    private fun showCallNotification(
        callId: String,
        callerName: String,
        callType: String,
        callerId: String,
        conversationId: String
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CALL_CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.description = "Incoming call notifications"
            channel.setBypassDnd(true)
            channel.lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            channel.enableVibration(true)
            channel.vibrationPattern = longArrayOf(0, 500, 250, 500)
            // Don't set sound here - we're playing it manually with Ringtone
            channel.setSound(null, null)
            notificationManager.createNotificationChannel(channel)
        }

        // Create intent to open native IncomingCallActivity (lightweight, no React Native)
        val fullScreenIntent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(IncomingCallActivity.EXTRA_CALL_ID, callId)
            putExtra(IncomingCallActivity.EXTRA_CALLER_ID, callerId)
            putExtra(IncomingCallActivity.EXTRA_CALLER_NAME, callerName)
            putExtra(IncomingCallActivity.EXTRA_CALL_TYPE, callType)
            putExtra(IncomingCallActivity.EXTRA_CONVERSATION_ID, conversationId)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Create decline intent
        val declineIntent = Intent(this, CallActionReceiver::class.java).apply {
            action = "DECLINE_CALL"
            putExtra("callId", callId)
        }

        val declinePendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Create answer intent - goes to MainActivity to start the actual call
        val answerIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("type", "call")
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("callType", callType)
            putExtra("conversationId", conversationId)
            putExtra("action", "answer")
        }

        val answerPendingIntent = PendingIntent.getActivity(
            this,
            2,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callTypeText = if (callType.equals("Video", ignoreCase = true)) "video" else "voice"

        val notification = NotificationCompat.Builder(this, CALL_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(callerName)
            .setContentText("Incoming $callTypeText call")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
            .addAction(android.R.drawable.ic_menu_call, "Answer", answerPendingIntent)
            .build()

        notificationManager.notify(CALL_NOTIFICATION_ID, notification)
        Log.d(TAG, "Call notification displayed for $callerName")
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "New FCM token: $token")
        // Token refresh is handled by JS side
    }
}
