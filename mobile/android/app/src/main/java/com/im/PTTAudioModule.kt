package com.im

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * Native module for playing raw PCM audio data in real-time
 * Used for PTT (Push-to-Talk) audio streaming playback
 */
class PTTAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PTTAudioModule"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private var audioTrack: AudioTrack? = null
    private val audioQueue = ConcurrentLinkedQueue<ByteArray>()
    private val isPlaying = AtomicBoolean(false)
    private var playbackThread: Thread? = null

    override fun getName(): String = "PTTAudioModule"

    /**
     * Initialize the audio track for playback
     */
    @ReactMethod
    fun init(promise: Promise) {
        try {
            if (audioTrack != null) {
                Log.d(TAG, "AudioTrack already initialized")
                promise.resolve(true)
                return
            }

            val bufferSize = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT
            )

            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AUDIO_FORMAT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(CHANNEL_CONFIG)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            Log.d(TAG, "AudioTrack initialized with buffer size: $bufferSize")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing AudioTrack: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Start playback
     */
    @ReactMethod
    fun startPlayback(promise: Promise) {
        try {
            if (audioTrack == null) {
                promise.reject("ERROR", "AudioTrack not initialized. Call init() first.")
                return
            }

            if (isPlaying.get()) {
                Log.d(TAG, "Already playing")
                promise.resolve(true)
                return
            }

            isPlaying.set(true)
            audioTrack?.play()

            // Start playback thread
            playbackThread = thread(start = true, name = "PTTPlaybackThread") {
                Log.d(TAG, "Playback thread started")
                while (isPlaying.get()) {
                    val chunk = audioQueue.poll()
                    if (chunk != null) {
                        audioTrack?.write(chunk, 0, chunk.size)
                    } else {
                        // Sleep briefly when queue is empty to avoid busy waiting
                        Thread.sleep(10)
                    }
                }
                Log.d(TAG, "Playback thread stopped")
            }

            Log.d(TAG, "Playback started")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting playback: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Add audio chunk to playback queue
     * @param audioDataBase64 Base64 encoded PCM audio data
     */
    @ReactMethod
    fun playChunk(audioDataBase64: String, promise: Promise) {
        try {
            val audioData = Base64.decode(audioDataBase64, Base64.DEFAULT)
            audioQueue.add(audioData)

            // Auto-start playback if not playing
            if (!isPlaying.get() && audioTrack != null) {
                isPlaying.set(true)
                audioTrack?.play()

                playbackThread = thread(start = true, name = "PTTPlaybackThread") {
                    while (isPlaying.get()) {
                        val chunk = audioQueue.poll()
                        if (chunk != null) {
                            audioTrack?.write(chunk, 0, chunk.size)
                        } else {
                            Thread.sleep(10)
                        }
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error playing chunk: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Stop playback
     */
    @ReactMethod
    fun stopPlayback(promise: Promise) {
        try {
            isPlaying.set(false)

            playbackThread?.interrupt()
            playbackThread = null

            audioTrack?.stop()
            audioQueue.clear()

            Log.d(TAG, "Playback stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping playback: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Release audio resources
     */
    @ReactMethod
    fun release(promise: Promise) {
        try {
            isPlaying.set(false)

            playbackThread?.interrupt()
            playbackThread = null

            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            audioQueue.clear()

            Log.d(TAG, "AudioTrack released")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing AudioTrack: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Check if currently playing
     */
    @ReactMethod
    fun isPlaying(promise: Promise) {
        promise.resolve(isPlaying.get())
    }

    /**
     * Get queue size (for debugging)
     */
    @ReactMethod
    fun getQueueSize(promise: Promise) {
        promise.resolve(audioQueue.size)
    }
}
