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

    /**
     * Data class to store pending call data without consuming WritableMap
     */
    data class PendingCallInfo(
        val action: String,
        val callId: String,
        val callerId: String,
        val callerName: String,
        val callType: String,
        val conversationId: String,
        val roomToken: String?,
        val roomId: String?,
        val liveKitUrl: String?
    ) {
        fun toWritableMap(): WritableMap {
            val map = Arguments.createMap()
            map.putString("action", action)
            map.putString("callId", callId)
            map.putString("callerId", callerId)
            map.putString("callerName", callerName)
            map.putString("callType", callType)
            map.putString("conversationId", conversationId)
            roomToken?.let { map.putString("roomToken", it) }
            roomId?.let { map.putString("roomId", it) }
            liveKitUrl?.let { map.putString("liveKitUrl", it) }
            return map
        }
    }

    companion object {
        private const val TAG = "CallEventModule"
        private var instance: CallEventModule? = null
        private var pendingCallInfo: PendingCallInfo? = null

        fun getInstance(): CallEventModule? = instance

        fun sendCallEvent(callData: WritableMap) {
            // Extract and store data as PendingCallInfo (not WritableMap which gets consumed)
            pendingCallInfo = PendingCallInfo(
                action = callData.getString("action") ?: "incoming",
                callId = callData.getString("callId") ?: "",
                callerId = callData.getString("callerId") ?: "",
                callerName = callData.getString("callerName") ?: "Unknown",
                callType = callData.getString("callType") ?: "Voice",
                conversationId = callData.getString("conversationId") ?: "",
                roomToken = callData.getString("roomToken"),
                roomId = callData.getString("roomId"),
                liveKitUrl = callData.getString("liveKitUrl")
            )
            Log.d(TAG, "Stored pending call info: $pendingCallInfo")

            val module = instance
            if (module != null && module.reactContext.hasActiveReactInstance()) {
                Log.d(TAG, "Sending call event to React Native")
                try {
                    module.reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onNativeCallEvent", callData)
                    Log.d(TAG, "Call event emitted successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error emitting call event: ${e.message}")
                }
            } else {
                Log.d(TAG, "React Native not ready, data stored for later retrieval")
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

        /**
         * Emit PTT received event to React Native
         */
        fun emitPTTReceived(context: android.content.Context, conversationId: String, senderId: String, senderName: String) {
            val module = instance
            if (module != null && module.reactContext.hasActiveReactInstance()) {
                val params = Arguments.createMap()
                params.putString("type", "ptt")
                params.putString("conversationId", conversationId)
                params.putString("senderId", senderId)
                params.putString("senderName", senderName)
                Log.d(TAG, "Emitting PTT received event to React Native: $params")
                try {
                    module.reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onPTTReceived", params)
                    Log.d(TAG, "PTT event emitted successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error emitting PTT event: ${e.message}")
                }
            } else {
                Log.d(TAG, "React Native not ready for PTT event")
            }
        }

        /**
         * Store pending call info without trying to send it immediately.
         * This is safer when React Native might not be ready yet.
         */
        fun storePendingCallInfo(
            action: String,
            callId: String,
            callerId: String,
            callerName: String,
            callType: String,
            conversationId: String,
            roomToken: String?,
            roomId: String?,
            liveKitUrl: String?
        ) {
            pendingCallInfo = PendingCallInfo(
                action = action,
                callId = callId,
                callerId = callerId,
                callerName = callerName,
                callType = callType,
                conversationId = conversationId,
                roomToken = roomToken,
                roomId = roomId,
                liveKitUrl = liveKitUrl
            )
            Log.d(TAG, "Stored pending call info (no immediate send): $pendingCallInfo")
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "CallEventModule"

    override fun initialize() {
        super.initialize()
        // Check for pending call info when React Native is ready
        pendingCallInfo?.let { info ->
            Log.d(TAG, "Sending pending call data to React Native: $info")
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onNativeCallEvent", info.toWritableMap())
            pendingCallInfo = null
        }
    }

    @ReactMethod
    fun getPendingCallData(promise: Promise) {
        Log.d(TAG, "getPendingCallData called")

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

        // Then check our own pending call info
        pendingCallInfo?.let { info ->
            Log.d(TAG, "Returning pending call info: $info")
            promise.resolve(info.toWritableMap())
            pendingCallInfo = null
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

                Log.d(TAG, "Returning pending intent data: $params")
                MainActivity.pendingCallIntent = null
                promise.resolve(params)
                return
            }
        }

        Log.d(TAG, "No pending call data found")
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

    /**
     * Called from React Native's background handler to trigger native incoming call handling.
     * This allows the RN background handler to delegate to native CallNotificationService
     * which has proper BAL exemption via foreground service.
     */
    @ReactMethod
    fun handleIncomingCallNatively(
        callId: String,
        callerId: String,
        callerName: String,
        callType: String,
        conversationId: String
    ) {
        Log.d(TAG, "handleIncomingCallNatively called: callId=$callId, caller=$callerName")

        try {
            val context = reactContext.applicationContext

            // Check if app is in foreground
            val isAppInForeground = MainApplication.isAppInForeground
            Log.d(TAG, "App in foreground: $isAppInForeground")

            if (isAppInForeground) {
                // App is in foreground - store data for React Native to handle
                Log.d(TAG, "App in foreground, storing call data for RN")
                storePendingCallInfo(
                    action = "incoming",
                    callId = callId,
                    callerId = callerId,
                    callerName = callerName,
                    callType = callType,
                    conversationId = conversationId,
                    roomToken = null,
                    roomId = null,
                    liveKitUrl = null
                )
                return
            }

            // App is in background - use native handling with foreground service
            Log.d(TAG, "App in background - triggering native call handling")

            // Start the foreground service which will launch IncomingCallActivity
            CallForegroundService.startIncomingCall(
                context,
                callId,
                callerId,
                callerName,
                callType,
                conversationId,
                launchActivity = true
            )

            Log.d(TAG, "Native foreground service started for incoming call")
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming call natively: ${e.message}", e)
        }
    }

    /**
     * Called from React Native's background handler to handle call ended notification
     */
    @ReactMethod
    fun handleCallEndedNatively(callId: String) {
        Log.d(TAG, "handleCallEndedNatively called: callId=$callId")
        CallNotificationService.endCall(reactContext.applicationContext, callId)
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
