package com.im

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module to check and request SYSTEM_ALERT_WINDOW (Display over other apps) permission.
 * This permission is required for showing the incoming call overlay on Android 10+.
 */
class OverlayPermissionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "OverlayPermissionModule"
    }

    override fun getName(): String = "OverlayPermissionModule"

    /**
     * Check if the app can draw overlays (has SYSTEM_ALERT_WINDOW permission)
     */
    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactApplicationContext)
            } else {
                true // Permission not needed on older versions
            }
            Log.d(TAG, "canDrawOverlays: $canDraw")
            promise.resolve(canDraw)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking overlay permission: ${e.message}")
            promise.resolve(false)
        }
    }

    /**
     * Open system settings to allow user to grant overlay permission
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "Opened overlay permission settings")
                promise.resolve(true)
            } else {
                // Permission not needed on older versions
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening overlay permission settings: ${e.message}")
            promise.reject("ERROR", "Failed to open settings: ${e.message}")
        }
    }

    /**
     * Check if overlay permission is needed (Android 6.0+)
     */
    @ReactMethod
    fun isOverlayPermissionNeeded(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
    }
}
