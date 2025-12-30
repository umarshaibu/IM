package com.im

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * Service that displays a full-screen overlay for incoming calls.
 * Uses SYSTEM_ALERT_WINDOW permission which bypasses BAL restrictions on all Android versions.
 *
 * This is the most reliable way to show an incoming call screen from the background
 * because overlay windows don't have the same restrictions as activity launches.
 */
class IncomingCallOverlayService : Service() {

    companion object {
        private const val TAG = "IncomingCallOverlay"
        private const val OVERLAY_NOTIFICATION_ID = 9998
        private const val OVERLAY_CHANNEL_ID = "call_overlay_service"

        private var isRunning = false

        /**
         * Check if overlay permission is granted
         */
        fun canDrawOverlays(context: Context): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true // Permission not needed on older versions
            }
        }

        /**
         * Start the overlay service for an incoming call
         */
        fun showIncomingCall(
            context: Context,
            callId: String,
            callerId: String,
            callerName: String,
            callType: String,
            conversationId: String
        ) {
            if (!canDrawOverlays(context)) {
                Log.w(TAG, "Cannot draw overlays - permission not granted")
                return
            }

            val intent = Intent(context, IncomingCallOverlayService::class.java).apply {
                action = "SHOW_OVERLAY"
                putExtra("callId", callId)
                putExtra("callerId", callerId)
                putExtra("callerName", callerName)
                putExtra("callType", callType)
                putExtra("conversationId", conversationId)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Dismiss the overlay
         */
        fun dismissOverlay(context: Context) {
            val intent = Intent(context, IncomingCallOverlayService::class.java).apply {
                action = "DISMISS_OVERLAY"
            }
            context.startService(intent)
        }
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var mainHandler = Handler(Looper.getMainLooper())

    // Call data
    private var callId: String? = null
    private var callerId: String? = null
    private var callerName: String? = null
    private var callType: String? = null
    private var conversationId: String? = null

    // Broadcast receiver for call end events
    private val callEndReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received broadcast to close overlay")
            removeOverlay()
            stopSelf()
        }
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Register for call end broadcasts
        val filter = IntentFilter("com.im.CLOSE_INCOMING_CALL")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(callEndReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(callEndReceiver, filter)
        }

        isRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "SHOW_OVERLAY" -> {
                callId = intent.getStringExtra("callId")
                callerId = intent.getStringExtra("callerId")
                callerName = intent.getStringExtra("callerName")
                callType = intent.getStringExtra("callType")
                conversationId = intent.getStringExtra("conversationId")

                Log.d(TAG, "Showing overlay for call: $callId from $callerName")

                // Start as foreground service
                startForeground(OVERLAY_NOTIFICATION_ID, createNotification())

                // Show the overlay
                mainHandler.post { showOverlay() }
            }
            "DISMISS_OVERLAY" -> {
                Log.d(TAG, "Dismissing overlay")
                removeOverlay()
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
        try {
            unregisterReceiver(callEndReceiver)
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering receiver: ${e.message}")
        }
        isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotification(): Notification {
        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                OVERLAY_CHANNEL_ID,
                "Call Overlay Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows incoming call overlay"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, OVERLAY_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Incoming Call")
            .setContentText("$callerName is calling...")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun showOverlay() {
        if (overlayView != null) {
            Log.d(TAG, "Overlay already showing")
            return
        }

        try {
            // Inflate the overlay layout
            val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
            overlayView = inflater.inflate(R.layout.incoming_call_overlay, null)

            // Set up the views
            overlayView?.apply {
                findViewById<TextView>(R.id.callerNameText)?.text = callerName ?: "Unknown"
                findViewById<TextView>(R.id.callTypeText)?.text =
                    if (callType.equals("Video", ignoreCase = true)) "Incoming video call" else "Incoming voice call"

                findViewById<Button>(R.id.declineButton)?.setOnClickListener {
                    Log.d(TAG, "Decline button clicked")
                    handleDecline()
                }

                findViewById<Button>(R.id.answerButton)?.setOnClickListener {
                    Log.d(TAG, "Answer button clicked")
                    handleAnswer()
                }
            }

            // Configure window parameters for full-screen overlay
            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            windowManager?.addView(overlayView, params)
            Log.d(TAG, "Overlay view added successfully")

        } catch (e: Exception) {
            Log.e(TAG, "Error showing overlay: ${e.message}", e)
        }
    }

    private fun removeOverlay() {
        try {
            overlayView?.let {
                windowManager?.removeView(it)
                overlayView = null
                Log.d(TAG, "Overlay removed")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing overlay: ${e.message}")
        }
    }

    private fun handleDecline() {
        callId?.let { id ->
            // Use the same decline logic as CallActionReceiver
            val intent = Intent(this, CallActionReceiver::class.java).apply {
                action = "DECLINE_CALL"
                putExtra("callId", id)
            }
            sendBroadcast(intent)
        }
        removeOverlay()
        stopSelf()
    }

    private fun handleAnswer() {
        callId?.let { id ->
            // Stop ringtone
            CallNotificationService.stopRingtone()

            // Cancel the call notification
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(CallNotificationService.CALL_NOTIFICATION_ID)

            // Try to join the call via native API first (like CallActionReceiver does)
            CallApiClient.joinCall(applicationContext, id) { result ->
                mainHandler.post {
                    if (result.success && result.roomToken != null) {
                        Log.d(TAG, "Native join call succeeded, launching MainActivity with token")
                        // Launch MainActivity with room token data
                        val mainIntent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            putExtra("type", "call")
                            putExtra("action", "answer")
                            putExtra("callId", id)
                            putExtra("callerId", callerId ?: "")
                            putExtra("callerName", callerName ?: "Unknown")
                            putExtra("callType", callType ?: "Voice")
                            putExtra("conversationId", conversationId ?: "")
                            putExtra("roomToken", result.roomToken)
                            putExtra("roomId", result.roomId ?: "")
                            putExtra("liveKitUrl", result.liveKitUrl ?: "")
                        }
                        startActivity(mainIntent)
                    } else {
                        Log.w(TAG, "Native join call failed: ${result.error}, launching app to let RN handle it")
                        // Fallback - launch app and let React Native handle the join
                        val mainIntent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            putExtra("type", "call")
                            putExtra("action", "answer")
                            putExtra("callId", id)
                            putExtra("callerId", callerId ?: "")
                            putExtra("callerName", callerName ?: "Unknown")
                            putExtra("callType", callType ?: "Voice")
                            putExtra("conversationId", conversationId ?: "")
                        }
                        startActivity(mainIntent)
                    }
                    removeOverlay()
                    stopSelf()
                }
            }
        }
    }
}
