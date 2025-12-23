package com.im

import android.app.NotificationManager
import android.content.Context
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class CallSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "CallSoundModule"
    }

    override fun getName(): String = "CallSoundModule"

    @ReactMethod
    fun stopRingtone(promise: Promise) {
        try {
            Log.d(TAG, "Stopping ringtone from React Native")
            CallNotificationService.stopRingtone()

            // Also cancel the notification
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(CallNotificationService.CALL_NOTIFICATION_ID)

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping ringtone: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelCallNotification(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(CallNotificationService.CALL_NOTIFICATION_ID)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
