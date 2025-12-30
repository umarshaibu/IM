package com.im

import android.app.Application
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.flipper.ReactNativeFlipper
import com.facebook.soloader.SoLoader
import com.livekit.reactnative.LiveKitReactNative
import com.livekit.reactnative.audio.AudioType

class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "MainApplication"

    // Track if the app is in foreground
    var isAppInForeground: Boolean = false
      private set

    // Track if React Native has been pre-warmed
    var isReactNativePreWarmed: Boolean = false
      private set

    fun setForegroundState(inForeground: Boolean) {
      android.util.Log.d(TAG, "App foreground state changed: $inForeground")
      isAppInForeground = inForeground
    }
  }

  // Lifecycle observer to track foreground state
  private val lifecycleObserver = object : DefaultLifecycleObserver {
    override fun onStart(owner: LifecycleOwner) {
      android.util.Log.d(TAG, "ProcessLifecycleOwner onStart - app in foreground")
      setForegroundState(true)
    }

    override fun onStop(owner: LifecycleOwner) {
      android.util.Log.d(TAG, "ProcessLifecycleOwner onStop - app in background")
      setForegroundState(false)
    }
  }

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Add our native CallSoundModule package
              add(CallSoundPackage())
              // Add PTT audio playback module
              add(PTTAudioPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)

    // Register lifecycle observer to track app foreground state
    ProcessLifecycleOwner.get().lifecycle.addObserver(lifecycleObserver)

    // Initialize LiveKit for audio/video calls
    LiveKitReactNative.setup(this, AudioType.CommunicationAudioType())

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
  }

  /**
   * Pre-warm React Native by creating the ReactContext.
   * This should be called from foreground services before launching MainActivity,
   * so that React Native is ready when the activity starts.
   *
   * Must be called on the main thread.
   */
  fun preWarmReactNative() {
    if (isReactNativePreWarmed) {
      android.util.Log.d(TAG, "React Native already pre-warmed")
      return
    }

    try {
      android.util.Log.d(TAG, "Pre-warming React Native...")

      // Get the ReactInstanceManager and create the context
      val instanceManager = reactNativeHost.reactInstanceManager

      // Check if context already exists
      if (instanceManager.currentReactContext != null) {
        android.util.Log.d(TAG, "React context already exists")
        isReactNativePreWarmed = true
        return
      }

      // Create React Context in background
      instanceManager.createReactContextInBackground()
      isReactNativePreWarmed = true
      android.util.Log.d(TAG, "React Native pre-warm initiated")
    } catch (e: Exception) {
      android.util.Log.e(TAG, "Error pre-warming React Native: ${e.message}", e)
    }
  }

  /**
   * Check if React Native context is ready
   */
  fun isReactContextReady(): Boolean {
    return try {
      reactNativeHost.reactInstanceManager.currentReactContext != null
    } catch (e: Exception) {
      false
    }
  }
}
