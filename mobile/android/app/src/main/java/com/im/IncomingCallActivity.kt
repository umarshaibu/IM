package com.im

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.localbroadcastmanager.content.LocalBroadcastManager

/**
 * Native Android Activity for displaying incoming calls.
 * This activity is lightweight and displays immediately without loading React Native,
 * providing a better user experience when receiving calls with the device locked or app closed.
 */
class IncomingCallActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "IncomingCallActivity"
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALLER_ID = "callerId"
        const val EXTRA_CALLER_NAME = "callerName"
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_CONVERSATION_ID = "conversationId"

        // Track active incoming call activity for closing from outside
        var currentCallId: String? = null

        fun closeIfCallId(callId: String) {
            if (currentCallId == callId) {
                currentCallId = null
            }
        }
    }

    private var callId: String? = null
    private var callerId: String? = null
    private var callerName: String? = null
    private var callType: String? = null
    private var conversationId: String? = null

    private var pulseAnimator: AnimatorSet? = null

    // Broadcast receiver to close this activity when call is declined from notification
    private val closeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received close broadcast, finishing activity")
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure window to show over lock screen
        configureWindowFlags()

        setContentView(R.layout.activity_incoming_call)

        // Register broadcast receiver for close events
        registerCloseReceiver()

        // Extract call data from intent
        extractCallData(intent)

        // Setup UI
        setupUI()

        // Start pulse animation
        startPulseAnimation()

        Log.d(TAG, "IncomingCallActivity created for call: $callId from $callerName")
    }

    private fun registerCloseReceiver() {
        val filter = IntentFilter("com.im.CLOSE_INCOMING_CALL")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(closeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(closeReceiver, filter)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractCallData(intent)
        setupUI()
    }

    private fun configureWindowFlags() {
        // Show activity over lock screen and turn screen on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)

            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        // Keep screen on while this activity is visible
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Make status bar transparent for full-screen effect
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
        }

        // Full screen immersive mode
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
    }

    private fun extractCallData(intent: Intent) {
        callId = intent.getStringExtra(EXTRA_CALL_ID)
        callerId = intent.getStringExtra(EXTRA_CALLER_ID)
        callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
        callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "Voice"
        conversationId = intent.getStringExtra(EXTRA_CONVERSATION_ID)

        // Track this call as the current incoming call
        currentCallId = callId

        Log.d(TAG, "Call data: id=$callId, caller=$callerName, type=$callType")
    }

    private fun setupUI() {
        try {
            // Set caller name
            findViewById<TextView>(R.id.callerName)?.text = callerName

            // Set call type text
            val callTypeText = if (callType.equals("Video", ignoreCase = true)) {
                "Incoming video call"
            } else {
                "Incoming voice call"
            }
            findViewById<TextView>(R.id.callTypeText)?.text = callTypeText

            // Set avatar initials
            val initials = getInitials(callerName ?: "?")
            findViewById<TextView>(R.id.avatarInitials)?.text = initials

            // Setup decline button
            findViewById<ImageButton>(R.id.declineButton)?.setOnClickListener {
                declineCall()
            }

            // Setup accept button
            findViewById<ImageButton>(R.id.acceptButton)?.setOnClickListener {
                acceptCall()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up UI: ${e.message}")
        }
    }

    private fun getInitials(name: String): String {
        val parts = name.trim().split(" ")
        return when {
            parts.size >= 2 -> "${parts[0].firstOrNull() ?: ""}${parts[1].firstOrNull() ?: ""}".uppercase()
            parts.isNotEmpty() && parts[0].isNotEmpty() -> parts[0].take(2).uppercase()
            else -> "?"
        }
    }

    private fun startPulseAnimation() {
        try {
            val pulseRing1 = findViewById<View>(R.id.pulseRing1) ?: return
            val pulseRing2 = findViewById<View>(R.id.pulseRing2) ?: return

            // Animation for ring 1
            val scaleX1 = ObjectAnimator.ofFloat(pulseRing1, "scaleX", 0.8f, 1.4f)
            val scaleY1 = ObjectAnimator.ofFloat(pulseRing1, "scaleY", 0.8f, 1.4f)
            val alpha1 = ObjectAnimator.ofFloat(pulseRing1, "alpha", 0.8f, 0f)

            val ring1Animator = AnimatorSet().apply {
                playTogether(scaleX1, scaleY1, alpha1)
                duration = 1500
                interpolator = AccelerateDecelerateInterpolator()
            }

            // Animation for ring 2 (delayed)
            val scaleX2 = ObjectAnimator.ofFloat(pulseRing2, "scaleX", 0.8f, 1.4f)
            val scaleY2 = ObjectAnimator.ofFloat(pulseRing2, "scaleY", 0.8f, 1.4f)
            val alpha2 = ObjectAnimator.ofFloat(pulseRing2, "alpha", 0.8f, 0f)

            val ring2Animator = AnimatorSet().apply {
                playTogether(scaleX2, scaleY2, alpha2)
                duration = 1500
                startDelay = 750
                interpolator = AccelerateDecelerateInterpolator()
            }

            // Combine and loop
            pulseAnimator = AnimatorSet().apply {
                playTogether(ring1Animator, ring2Animator)
                addListener(object : android.animation.Animator.AnimatorListener {
                    override fun onAnimationStart(animation: android.animation.Animator) {}
                    override fun onAnimationEnd(animation: android.animation.Animator) {
                        try {
                            // Reset and restart
                            pulseRing1.scaleX = 0.8f
                            pulseRing1.scaleY = 0.8f
                            pulseRing1.alpha = 0.8f
                            pulseRing2.scaleX = 0.8f
                            pulseRing2.scaleY = 0.8f
                            pulseRing2.alpha = 0.8f

                            if (!isFinishing && !isDestroyed) {
                                start()
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error restarting animation: ${e.message}")
                        }
                    }
                    override fun onAnimationCancel(animation: android.animation.Animator) {}
                    override fun onAnimationRepeat(animation: android.animation.Animator) {}
                })
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting pulse animation: ${e.message}")
        }
    }

    private fun stopPulseAnimation() {
        pulseAnimator?.cancel()
        pulseAnimator = null
    }

    private fun acceptCall() {
        Log.d(TAG, "Accepting call: $callId")

        val currentCallId = callId ?: return

        // Disable buttons to prevent double-tap
        findViewById<ImageButton>(R.id.acceptButton)?.isEnabled = false
        findViewById<ImageButton>(R.id.declineButton)?.isEnabled = false

        // Update status text
        findViewById<TextView>(R.id.statusText)?.text = "Connecting..."

        // Stop ringtone and cancel notification
        stopRingtoneAndNotification()

        // Join the call via HTTP API BEFORE launching the app
        // This ensures the backend knows we answered even if React Native takes time to load
        CallApiClient.joinCall(this, currentCallId) { result ->
            runOnUiThread {
                if (result.success) {
                    Log.d(TAG, "Call joined via API successfully, launching app")

                    // Launch MainActivity with call data including the room token
                    val intent = Intent(this, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("type", "call")
                        putExtra("callId", currentCallId)
                        putExtra("callerId", callerId)
                        putExtra("callerName", callerName)
                        putExtra("callType", callType)
                        putExtra("conversationId", conversationId)
                        putExtra("action", "answer")
                        // Pass the room token so React Native can connect directly
                        putExtra("roomToken", result.roomToken)
                        putExtra("roomId", result.roomId)
                        putExtra("liveKitUrl", result.liveKitUrl)
                    }
                    startActivity(intent)
                    finish()
                } else {
                    Log.e(TAG, "Failed to join call via API: ${result.error}")
                    // Still try to launch the app - maybe React Native can handle it
                    val intent = Intent(this, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("type", "call")
                        putExtra("callId", currentCallId)
                        putExtra("callerId", callerId)
                        putExtra("callerName", callerName)
                        putExtra("callType", callType)
                        putExtra("conversationId", conversationId)
                        putExtra("action", "answer")
                    }
                    startActivity(intent)
                    finish()
                }
            }
        }
    }

    private fun declineCall() {
        Log.d(TAG, "Declining call: $callId")

        val currentCallId = callId ?: return

        // Disable buttons to prevent double-tap
        findViewById<ImageButton>(R.id.acceptButton)?.isEnabled = false
        findViewById<ImageButton>(R.id.declineButton)?.isEnabled = false

        // Stop ringtone and cancel notification
        stopRingtoneAndNotification()

        // Decline the call via HTTP API
        // This ensures the backend knows we declined even if React Native isn't loaded
        CallApiClient.declineCall(this, currentCallId) { success, error ->
            Log.d(TAG, "Decline API call result: success=$success, error=$error")
        }

        // Also store decline for React Native to handle (in case it's already loaded)
        CallActionReceiver.pendingDeclineCallId = currentCallId

        // Try to send decline event to React Native
        CallEventModule.sendDeclineEvent(currentCallId)

        // Close this activity immediately (don't wait for API response)
        finish()
    }

    private fun stopRingtoneAndNotification() {
        // Stop native ringtone
        CallNotificationService.stopRingtone()

        // Cancel the notification
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(CallNotificationService.CALL_NOTIFICATION_ID)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopPulseAnimation()

        // Clear current call ID
        currentCallId = null

        // Unregister broadcast receiver
        try {
            unregisterReceiver(closeReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver: ${e.message}")
        }

        Log.d(TAG, "IncomingCallActivity destroyed")
    }

    @Suppress("DEPRECATION")
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back button from dismissing the call screen
        // User must accept or decline - do nothing
    }
}
