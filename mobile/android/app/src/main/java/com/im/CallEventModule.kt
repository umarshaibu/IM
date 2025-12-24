package com.im

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallEventModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "CallEventModule"
        private var instance: CallEventModule? = null
        private var pendingCallData: WritableMap? = null

        fun getInstance(): CallEventModule? = instance

        fun sendCallEvent(callData: WritableMap) {
            val module = instance
            if (module != null && module.reactContext.hasActiveReactInstance()) {
                Log.d(TAG, "Sending call event to React Native: $callData")
                module.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNativeCallEvent", callData)
            } else {
                Log.d(TAG, "React Native not ready, storing pending call data")
                pendingCallData = callData
            }
        }

        fun sendDeclineEvent(callId: String) {
            val module = instance
            if (module != null && module.reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap()
                params.putString("action", "decline")
                params.putString("callId", callId)
                Log.d(TAG, "Sending decline event to React Native: $params")
                module.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNativeCallEvent", params)
            }
        }

        fun sendAnswerEvent(callId: String, callerId: String, callerName: String, callType: String, conversationId: String) {
            val module = instance
            if (module != null && module.reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap()
                params.putString("action", "answer")
                params.putString("callId", callId)
                params.putString("callerId", callerId)
                params.putString("callerName", callerName)
                params.putString("callType", callType)
                params.putString("conversationId", conversationId)
                Log.d(TAG, "Sending answer event to React Native: $params")
                module.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNativeCallEvent", params)
            }
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "CallEventModule"

    override fun initialize() {
        super.initialize()
        // Check for pending call data when React Native is ready
        pendingCallData?.let { data ->
            Log.d(TAG, "Sending pending call data to React Native")
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onNativeCallEvent", data)
            pendingCallData = null
        }
    }

    @ReactMethod
    fun getPendingCallData(promise: Promise) {
        // First check for pending decline
        CallActionReceiver.pendingDeclineCallId?.let { callId ->
            val params = Arguments.createMap()
            params.putString("action", "decline")
            params.putString("callId", callId)
            CallActionReceiver.pendingDeclineCallId = null
            Log.d(TAG, "Returning pending decline for call: $callId")
            promise.resolve(params)
            return
        }

        // Then check our own pending data
        pendingCallData?.let { data ->
            promise.resolve(data)
            pendingCallData = null
            return
        }

        // Then check MainActivity's pending intent
        MainActivity.pendingCallIntent?.let { intent ->
            val callId = intent.getStringExtra("callId")
            if (callId != null) {
                val params = Arguments.createMap()
                params.putString("action", intent.getStringExtra("action") ?: "incoming")
                params.putString("callId", callId)
                params.putString("callerId", intent.getStringExtra("callerId") ?: "")
                params.putString("callerName", intent.getStringExtra("callerName") ?: "Unknown")
                params.putString("callType", intent.getStringExtra("callType") ?: "Voice")
                params.putString("conversationId", intent.getStringExtra("conversationId") ?: "")

                // Include room token data if available (from native join call)
                intent.getStringExtra("roomToken")?.let { params.putString("roomToken", it) }
                intent.getStringExtra("roomId")?.let { params.putString("roomId", it) }
                intent.getStringExtra("liveKitUrl")?.let { params.putString("liveKitUrl", it) }

                MainActivity.pendingCallIntent = null
                promise.resolve(params)
                return
            }
        }

        promise.resolve(null)
    }

    /**
     * Called by React Native when a call ends (caller hangs up or call is cancelled)
     * This closes the native incoming call activity if it's showing
     */
    @ReactMethod
    fun endCall(callId: String) {
        Log.d(TAG, "endCall called from React Native for callId: $callId")
        CallNotificationService.endCall(reactContext, callId)
    }

    /**
     * Save auth credentials for native API calls
     * This allows the native IncomingCallActivity to join/decline calls via HTTP
     */
    @ReactMethod
    fun saveCredentials(accessToken: String, apiUrl: String) {
        Log.d(TAG, "Saving credentials for native API calls")
        CallApiClient.saveCredentials(reactContext, accessToken, apiUrl)
    }

    /**
     * Clear auth credentials on logout
     */
    @ReactMethod
    fun clearCredentials() {
        Log.d(TAG, "Clearing credentials")
        CallApiClient.clearCredentials(reactContext)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built in Event Emitter Calls
    }
}
