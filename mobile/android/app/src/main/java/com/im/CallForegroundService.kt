package com.im

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service for handling incoming calls.
 *
 * A foreground service has Background Activity Launch (BAL) exemption on Android 10+,
 * allowing it to launch activities even when the app is in the background.
 * This is the recommended approach for VoIP/call apps.
 */
class CallForegroundService : Service() {

    companion object {
        private const val TAG = "CallForegroundService"
        private const val FOREGROUND_SERVICE_ID = 9998
        private const val CHANNEL_ID = "call_foreground_service"

        const val ACTION_START_INCOMING_CALL = "com.im.START_INCOMING_CALL"
        const val ACTION_STOP_SERVICE = "com.im.STOP_CALL_SERVICE"

        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALLER_ID = "callerId"
        const val EXTRA_CALLER_NAME = "callerName"
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_CONVERSATION_ID = "conversationId"
        const val EXTRA_LAUNCH_ACTIVITY = "launchActivity"

        /**
         * Start the foreground service to handle an incoming call
         * @param launchActivity if true, the service will launch IncomingCallActivity.
         *                       if false, it will only keep the app process alive (for use with full-screen intent)
         */
        fun startIncomingCall(
            context: Context,
            callId: String,
            callerId: String,
            callerName: String,
            callType: String,
            conversationId: String,
            launchActivity: Boolean = true
        ) {
            val intent = Intent(context, CallForegroundService::class.java).apply {
                action = ACTION_START_INCOMING_CALL
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_CALLER_ID, callerId)
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALL_TYPE, callType)
                putExtra(EXTRA_CONVERSATION_ID, conversationId)
                putExtra(EXTRA_LAUNCH_ACTIVITY, launchActivity)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            Log.d(TAG, "Started foreground service for incoming call: $callId (launchActivity=$launchActivity)")
        }

        /**
         * Stop the foreground service
         */
        fun stopService(context: Context) {
            val intent = Intent(context, CallForegroundService::class.java).apply {
                action = ACTION_STOP_SERVICE
            }
            context.stopService(intent)
            Log.d(TAG, "Stopped foreground service")
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: action=${intent?.action}")

        when (intent?.action) {
            ACTION_START_INCOMING_CALL -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: ""
                val callerId = intent.getStringExtra(EXTRA_CALLER_ID) ?: ""
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
                val callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "Voice"
                val conversationId = intent.getStringExtra(EXTRA_CONVERSATION_ID) ?: ""
                val launchActivity = intent.getBooleanExtra(EXTRA_LAUNCH_ACTIVITY, true)

                // Start foreground immediately
                startForeground(FOREGROUND_SERVICE_ID, createForegroundNotification(callerName, callType))

                // Acquire wake lock to keep CPU running
                acquireWakeLock()

                // Only launch the activity if requested
                // When using full-screen intent, we don't launch from here to avoid duplicates
                if (launchActivity) {
                    // Now launch the IncomingCallActivity
                    // As a foreground service, we have BAL exemption
                    launchIncomingCallActivity(callId, callerId, callerName, callType, conversationId)
                } else {
                    Log.d(TAG, "Foreground service started for process keep-alive only (activity launched via full-screen intent)")
                }
            }
            ACTION_STOP_SERVICE -> {
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            else -> {
                Log.w(TAG, "Unknown action: ${intent?.action}")
            }
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
        Log.d(TAG, "Service destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Used to keep call service running"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createForegroundNotification(callerName: String, callType: String): Notification {
        val callTypeText = if (callType.equals("Video", ignoreCase = true)) "video" else "voice"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Incoming $callTypeText call")
            .setContentText("From $callerName")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "IM:CallForegroundServiceWakeLock"
            )
            wakeLock?.acquire(60 * 1000L) // 60 seconds timeout
            Log.d(TAG, "Wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring wake lock: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "Wake lock released")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock: ${e.message}")
        }
    }

    /**
     * Launch IncomingCallActivity from the foreground service.
     * As a foreground service, we have BAL (Background Activity Launch) exemption.
     */
    private fun launchIncomingCallActivity(
        callId: String,
        callerId: String,
        callerName: String,
        callType: String,
        conversationId: String
    ) {
        try {
            Log.d(TAG, "Launching IncomingCallActivity from foreground service")

            val intent = Intent(this, IncomingCallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_NO_USER_ACTION
                putExtra(IncomingCallActivity.EXTRA_CALL_ID, callId)
                putExtra(IncomingCallActivity.EXTRA_CALLER_ID, callerId)
                putExtra(IncomingCallActivity.EXTRA_CALLER_NAME, callerName)
                putExtra(IncomingCallActivity.EXTRA_CALL_TYPE, callType)
                putExtra(IncomingCallActivity.EXTRA_CONVERSATION_ID, conversationId)
            }

            startActivity(intent)
            Log.d(TAG, "IncomingCallActivity launched successfully from foreground service")

            // IMPORTANT: Do NOT stop the service immediately!
            // The foreground service must stay running to:
            // 1. Keep the activity alive (BAL exemption continues as long as service runs)
            // 2. Maintain the wake lock to prevent the device from sleeping
            // 3. The service will be stopped by CallNotificationService.endCall() or
            //    when the user answers/declines the call
            Log.d(TAG, "Foreground service will continue running until call ends")

        } catch (e: Exception) {
            Log.e(TAG, "Error launching IncomingCallActivity from foreground service: ${e.message}", e)
            // Only clean up on error - activity failed to launch
            releaseWakeLock()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }
}
