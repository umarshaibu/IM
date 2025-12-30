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
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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

        // Pre-warm React Native in background so it's ready when user accepts call
        preWarmReactNative()

        Log.d(TAG, "IncomingCallActivity created for call: $callId from $callerName")
    }

    /**
     * Pre-warm React Native so it's ready when user accepts the call.
     * This runs on the main thread to initialize RN context in background.
     */
    private fun preWarmReactNative() {
        try {
            val app = application as? MainApplication
            if (app != null) {
                Log.d(TAG, "Pre-warming React Native from IncomingCallActivity")
                app.preWarmReactNative()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error pre-warming React Native: ${e.message}")
        }
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
        try {
            // CRITICAL: These flags must be set BEFORE setContentView for best results
            // Show activity over lock screen and turn screen on
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)

                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                keyguardManager?.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                    override fun onDismissSucceeded() {
                        Log.d(TAG, "Keyguard dismissed successfully")
                    }
                    override fun onDismissCancelled() {
                        Log.d(TAG, "Keyguard dismiss cancelled")
                    }
                    override fun onDismissError() {
                        Log.e(TAG, "Keyguard dismiss error")
                    }
                })
            }

            // Always add these flags for maximum compatibility
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
            )

            // Keep screen on while this activity is visible
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

            // Make status bar and navigation bar transparent for full-screen effect
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT

            // Use modern WindowInsetsController API for Android 11+ or fallback for older
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Modern approach for Android 11+
                WindowCompat.setDecorFitsSystemWindows(window, false)
            } else {
                // Legacy approach for older Android versions
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                )
            }

            Log.d(TAG, "Window flags configured successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring window flags: ${e.message}", e)
        }
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

        // Update status text to show we're connecting
        findViewById<TextView>(R.id.statusText)?.text = "Connecting..."

        // Stop ringtone but keep this activity visible
        CallNotificationService.stopRingtone()

        // Join the call via HTTP API BEFORE launching the app
        // This ensures the backend knows we answered even if React Native takes time to load
        CallApiClient.joinCall(this, currentCallId) { result ->
            runOnUiThread {
                if (result.success) {
                    Log.d(TAG, "Call joined via API successfully")
                    Log.d(TAG, "Room token: ${result.roomToken?.take(20)}...")
                    Log.d(TAG, "Room ID: ${result.roomId}")
                    Log.d(TAG, "LiveKit URL: ${result.liveKitUrl}")

                    // Update status to show call is connected
                    findViewById<TextView>(R.id.statusText)?.text = "Connected - Opening app..."

                    // Store pending call info BEFORE launching MainActivity
                    // This ensures React Native can pick it up when it's ready
                    CallEventModule.storePendingCallInfo(
                        "answer",
                        currentCallId,
                        callerId ?: "",
                        callerName ?: "Unknown",
                        callType ?: "Voice",
                        conversationId ?: "",
                        result.roomToken,
                        result.roomId,
                        result.liveKitUrl
                    )

                    // Wait for React Native to be ready, then launch MainActivity
                    waitForReactNativeAndLaunch()

                } else {
                    Log.e(TAG, "Failed to join call via API: ${result.error}")
                    findViewById<TextView>(R.id.statusText)?.text = "Connection failed - Opening app..."

                    // Store pending call info without room token - React Native will try to join
                    CallEventModule.storePendingCallInfo(
                        "answer",
                        currentCallId,
                        callerId ?: "",
                        callerName ?: "Unknown",
                        callType ?: "Voice",
                        conversationId ?: "",
                        null, null, null
                    )

                    // Wait for React Native to be ready, then launch MainActivity
                    waitForReactNativeAndLaunch()
                }
            }
        }
    }

    /**
     * Wait for React Native context to be ready before launching MainActivity.
     * This prevents the "UIManager not properly initialized" crash.
     */
    private fun waitForReactNativeAndLaunch() {
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        val app = application as? MainApplication
        var attempts = 0
        val maxAttempts = 50 // 5 seconds max wait (50 * 100ms)

        val checkReactNative = object : Runnable {
            override fun run() {
                attempts++
                val isReady = app?.isReactContextReady() == true
                Log.d(TAG, "Waiting for React Native... attempt=$attempts, ready=$isReady")

                if (isReady || attempts >= maxAttempts) {
                    if (isReady) {
                        Log.d(TAG, "React Native is ready, launching MainActivity")
                    } else {
                        Log.w(TAG, "React Native not ready after $maxAttempts attempts, launching anyway")
                    }
                    launchMainActivity()
                } else {
                    // Check again in 100ms
                    handler.postDelayed(this, 100)
                }
            }
        }

        // Start checking
        handler.post(checkReactNative)
    }

    /**
     * Launch MainActivity after React Native is ready
     */
    private fun launchMainActivity() {
        if (isFinishing || isDestroyed) return

        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                // FLAG_ACTIVITY_NEW_TASK - Start activity in a new task
                // FLAG_ACTIVITY_CLEAR_TOP - If activity exists, bring it to front and clear activities above it
                // FLAG_ACTIVITY_SINGLE_TOP - Don't create new instance if already at top
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                // Add extra to indicate this is from an incoming call
                putExtra("fromIncomingCall", true)
            }
            Log.d(TAG, "Launching MainActivity to foreground (React Native should be ready)")
            startActivity(intent)

            // Wait a bit for MainActivity to fully load, then finish this activity
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                if (!isFinishing && !isDestroyed) {
                    Log.d(TAG, "Finishing IncomingCallActivity after MainActivity launched")
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.cancel(CallNotificationService.CALL_NOTIFICATION_ID)
                    CallForegroundService.stopService(this)
                    finish()
                }
            }, 1000) // 1 second delay for smooth transition
        } catch (e: Exception) {
            Log.e(TAG, "Error launching MainActivity: ${e.message}", e)
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

        // Stop the foreground service that launched this activity
        CallForegroundService.stopService(this)
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
