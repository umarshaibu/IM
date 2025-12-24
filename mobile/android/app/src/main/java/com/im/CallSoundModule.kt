package com.im

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class CallSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "CallSoundModule"
        private var mediaPlayer: MediaPlayer? = null
    }

    override fun getName(): String = "CallSoundModule"

    @ReactMethod
    fun playSound(soundName: String, loop: Boolean, promise: Promise) {
        try {
            Log.d(TAG, "Playing sound: $soundName, loop: $loop")

            // Stop any currently playing sound
            stopMediaPlayer()

            // Get the resource ID for the sound
            val resourceId = reactApplicationContext.resources.getIdentifier(
                soundName,
                "raw",
                reactApplicationContext.packageName
            )

            if (resourceId == 0) {
                Log.e(TAG, "Sound resource not found: $soundName")
                promise.reject("ERROR", "Sound resource not found: $soundName")
                return
            }

            Log.d(TAG, "Found resource ID: $resourceId for $soundName")

            mediaPlayer = MediaPlayer.create(reactApplicationContext, resourceId).apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = loop
                setVolume(1.0f, 1.0f)

                setOnCompletionListener { mp ->
                    if (!loop) {
                        Log.d(TAG, "Sound completed: $soundName")
                        mp.release()
                        if (mediaPlayer == mp) {
                            mediaPlayer = null
                        }
                    }
                }

                setOnErrorListener { mp, what, extra ->
                    Log.e(TAG, "MediaPlayer error: what=$what, extra=$extra")
                    mp.release()
                    if (mediaPlayer == mp) {
                        mediaPlayer = null
                    }
                    true
                }

                start()
            }

            Log.d(TAG, "Sound started playing: $soundName")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error playing sound: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopSound(promise: Promise) {
        try {
            Log.d(TAG, "Stopping sound")
            stopMediaPlayer()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping sound: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    private fun stopMediaPlayer() {
        mediaPlayer?.let { mp ->
            try {
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing media player: ${e.message}")
            }
            mediaPlayer = null
        }
    }

    @ReactMethod
    fun stopRingtone(promise: Promise) {
        try {
            Log.d(TAG, "Stopping ringtone from React Native")
            CallNotificationService.stopRingtone()

            // Also stop any media player sound
            stopMediaPlayer()

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
