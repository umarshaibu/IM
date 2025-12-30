package com.im

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native module for handling battery optimization settings.
 * This allows the app to request exemption from battery optimization,
 * which is critical for receiving calls when the app is in background.
 */
class BatteryOptimizationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BatteryOptimization"
    }

    override fun getName(): String = "BatteryOptimization"

    /**
     * Check if app is exempt from battery optimization
     */
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                val isIgnoring = powerManager.isIgnoringBatteryOptimizations(context.packageName)
                Log.d(TAG, "isIgnoringBatteryOptimizations: $isIgnoring")
                promise.resolve(isIgnoring)
            } else {
                // Battery optimization not applicable for older versions
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking battery optimization: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Request battery optimization exemption
     * This will open the system settings for the user to disable battery optimization
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager

                if (!powerManager.isIgnoringBatteryOptimizations(context.packageName)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    Log.d(TAG, "Opened battery optimization settings")
                    promise.resolve(true)
                } else {
                    Log.d(TAG, "Already ignoring battery optimizations")
                    promise.resolve(true)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting battery optimization exemption: ${e.message}")
            // Fall back to opening the general battery settings
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.reject("ERROR", e.message)
            }
        }
    }

    /**
     * Open app-specific battery settings
     * Useful for phones with aggressive battery management (Xiaomi, Huawei, etc.)
     */
    @ReactMethod
    fun openAppBatterySettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening app settings: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get device manufacturer for special handling
     */
    @ReactMethod
    fun getDeviceManufacturer(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            Log.d(TAG, "Device manufacturer: $manufacturer")
            promise.resolve(manufacturer)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Check if device is from a manufacturer known for aggressive battery optimization
     */
    @ReactMethod
    fun hasAggressiveBatteryManagement(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            val aggressiveManufacturers = listOf(
                "xiaomi", "redmi", "poco",  // Xiaomi brands
                "huawei", "honor",           // Huawei brands
                "oppo", "realme", "oneplus", // BBK brands
                "vivo", "iqoo",              // Vivo brands
                "samsung",                   // Samsung (One UI has Sleeping apps)
                "meizu",
                "asus",
                "lenovo"
            )
            val hasAggressive = aggressiveManufacturers.any { manufacturer.contains(it) }
            Log.d(TAG, "Has aggressive battery management: $hasAggressive (manufacturer: $manufacturer)")
            promise.resolve(hasAggressive)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Open manufacturer-specific battery settings
     * These are needed because some manufacturers have their own battery optimization
     * in addition to the standard Android one
     */
    @ReactMethod
    fun openManufacturerBatterySettings(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            val intent = when {
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.miui.powerkeeper",
                            "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                        )
                        putExtra("package_name", reactApplicationContext.packageName)
                        putExtra("package_label", "IM")
                    }
                }
                manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                        )
                    }
                }
                manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.coloros.oppoguardelf",
                            "com.coloros.powermanager.fuelga498.PowerUsageModelActivity"
                        )
                    }
                }
                manufacturer.contains("vivo") -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.vivo.permissionmanager",
                            "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                        )
                    }
                }
                manufacturer.contains("samsung") -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.samsung.android.lool",
                            "com.samsung.android.sm.battery.ui.BatteryActivity"
                        )
                    }
                }
                else -> null
            }

            if (intent != null) {
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                try {
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(true)
                } catch (e: Exception) {
                    // Fall back to standard app settings
                    Log.w(TAG, "Manufacturer settings not found, opening app settings")
                    openAppBatterySettings(promise)
                }
            } else {
                // No specific manufacturer settings, open general app settings
                openAppBatterySettings(promise)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening manufacturer settings: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }
}
