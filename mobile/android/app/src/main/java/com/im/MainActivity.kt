package com.im

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  companion object {
    private const val TAG = "MainActivity"
    // Store pending call data for when React Native is ready
    var pendingCallIntent: Intent? = null
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "IM"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleCallIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleCallIntent(intent)
  }

  private fun handleCallIntent(intent: Intent) {
    val type = intent.getStringExtra("type")
    if (type == "call") {
      val callId = intent.getStringExtra("callId") ?: return
      Log.d(TAG, "Handling call intent: callId=$callId")

      // Stop native ringtone when opening app from notification
      CallNotificationService.stopRingtone()

      // Store the intent and try to send after a delay to allow React Native to initialize
      pendingCallIntent = intent

      // Try to send after a delay to allow React Native to initialize
      Handler(Looper.getMainLooper()).postDelayed({
        sendPendingCallEvent()
      }, 1500)
    }
  }

  fun sendPendingCallEvent() {
    val intent = pendingCallIntent ?: return
    val callId = intent.getStringExtra("callId") ?: return
    val callerId = intent.getStringExtra("callerId") ?: ""
    val callerName = intent.getStringExtra("callerName") ?: "Unknown"
    val callType = intent.getStringExtra("callType") ?: "Voice"
    val conversationId = intent.getStringExtra("conversationId") ?: ""
    val action = intent.getStringExtra("action") ?: "incoming"

    try {
      val params = Arguments.createMap()
      params.putString("action", action)
      params.putString("callId", callId)
      params.putString("callerId", callerId)
      params.putString("callerName", callerName)
      params.putString("callType", callType)
      params.putString("conversationId", conversationId)

      CallEventModule.sendCallEvent(params)
      pendingCallIntent = null
      Log.d(TAG, "Call event sent successfully")
    } catch (e: Exception) {
      Log.e(TAG, "Error sending call event, will retry: ${e.message}")
      // Will be picked up by CallEventModule.initialize() or getPendingCallData()
    }
  }
}
