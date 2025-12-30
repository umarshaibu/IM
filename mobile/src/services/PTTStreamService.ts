import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import * as signalr from './signalr';
import { NativePTTAudio } from './NativePTTAudio';

// Audio configuration for streaming
const AUDIO_CONFIG = {
  sampleRate: 16000, // 16kHz for good voice quality with low bandwidth
  channels: 1, // Mono for PTT
  bitsPerSample: 16,
  audioSource: 6, // Voice communication source on Android
  bufferSize: 4096, // Buffer size for audio chunks
};

class PTTStreamService {
  private isStreaming = false;
  private currentConversationId: string | null = null;
  private audioChunks: string[] = [];
  private playbackQueue: string[] = [];
  private isPlaying = false;
  private nativeAudioInitialized = false;

  /**
   * Initialize the audio stream
   */
  async init(): Promise<void> {
    try {
      LiveAudioStream.init({
        sampleRate: AUDIO_CONFIG.sampleRate,
        channels: AUDIO_CONFIG.channels,
        bitsPerSample: AUDIO_CONFIG.bitsPerSample,
        audioSource: AUDIO_CONFIG.audioSource,
        bufferSize: AUDIO_CONFIG.bufferSize,
        wavFile: '', // Empty - we stream in real-time, not saving to file
      });

      // Listen for audio data events
      LiveAudioStream.on('data', (data: string) => {
        if (this.isStreaming && this.currentConversationId) {
          // Send audio chunk via SignalR
          this.sendAudioChunk(data);
        }
      });

      // Initialize native audio player for playback
      if (NativePTTAudio.isAvailable()) {
        this.nativeAudioInitialized = await NativePTTAudio.init();
        console.log('Native PTT audio initialized:', this.nativeAudioInitialized);
      }

      console.log('PTTStreamService initialized');
    } catch (error) {
      console.error('Error initializing PTTStreamService:', error);
    }
  }

  /**
   * Start streaming audio for PTT
   */
  async startStreaming(conversationId: string): Promise<boolean> {
    try {
      if (this.isStreaming) {
        console.warn('PTT streaming already in progress');
        return false;
      }

      this.currentConversationId = conversationId;
      this.audioChunks = [];

      // Notify server that PTT started
      await signalr.startPTT(conversationId);

      // Start capturing audio
      await LiveAudioStream.start();
      this.isStreaming = true;

      console.log('PTT streaming started for conversation:', conversationId);
      return true;
    } catch (error) {
      console.error('Error starting PTT stream:', error);
      this.isStreaming = false;
      return false;
    }
  }

  /**
   * Stop streaming audio
   */
  async stopStreaming(): Promise<{ duration: number }> {
    const duration = this.audioChunks.length * (AUDIO_CONFIG.bufferSize / AUDIO_CONFIG.sampleRate) * 1000;

    try {
      if (!this.isStreaming) {
        return { duration: 0 };
      }

      // Stop capturing audio
      await LiveAudioStream.stop();
      this.isStreaming = false;

      // Notify server that PTT ended
      if (this.currentConversationId) {
        await signalr.endPTT(this.currentConversationId, null, Math.floor(duration));
      }

      console.log('PTT streaming stopped, duration:', duration, 'ms');

      this.currentConversationId = null;
      this.audioChunks = [];

      return { duration: Math.floor(duration) };
    } catch (error) {
      console.error('Error stopping PTT stream:', error);
      this.isStreaming = false;
      return { duration: 0 };
    }
  }

  /**
   * Cancel streaming (user slid to cancel)
   */
  async cancelStreaming(): Promise<void> {
    try {
      if (!this.isStreaming) {
        return;
      }

      await LiveAudioStream.stop();
      this.isStreaming = false;

      // Notify server that PTT was cancelled
      if (this.currentConversationId) {
        await signalr.cancelPTT(this.currentConversationId);
      }

      console.log('PTT streaming cancelled');

      this.currentConversationId = null;
      this.audioChunks = [];
    } catch (error) {
      console.error('Error cancelling PTT stream:', error);
      this.isStreaming = false;
    }
  }

  /**
   * Send audio chunk to server
   */
  private async sendAudioChunk(audioDataBase64: string): Promise<void> {
    try {
      if (this.currentConversationId) {
        // Store chunk locally for duration calculation
        this.audioChunks.push(audioDataBase64);

        // Send to server via SignalR
        await signalr.sendPTTChunk(this.currentConversationId, audioDataBase64);
      }
    } catch (error) {
      console.error('Error sending PTT chunk:', error);
    }
  }

  /**
   * Add received audio chunk to playback queue
   */
  addReceivedChunk(conversationId: string, userId: string, audioChunkBase64: string): void {
    this.playbackQueue.push(audioChunkBase64);

    // Start playback if not already playing
    if (!this.isPlaying) {
      this.processPlaybackQueue();
    }
  }

  /**
   * Process the playback queue
   */
  private async processPlaybackQueue(): Promise<void> {
    if (this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    while (this.playbackQueue.length > 0) {
      const chunk = this.playbackQueue.shift();
      if (chunk) {
        await this.playAudioChunk(chunk);
      }
    }

    this.isPlaying = false;
  }

  /**
   * Play a single audio chunk using native audio player
   */
  private async playAudioChunk(audioDataBase64: string): Promise<void> {
    try {
      if (this.nativeAudioInitialized && NativePTTAudio.isAvailable()) {
        // Use native audio player for real-time playback
        await NativePTTAudio.playChunk(audioDataBase64);
      } else {
        // Fallback: just log the chunk (for platforms without native support)
        console.log('Received PTT chunk, length:', audioDataBase64.length);
      }
    } catch (error) {
      console.error('Error playing PTT chunk:', error);
    }
  }

  /**
   * Stop PTT playback
   * Call this when the PTT transmission ends
   */
  async stopPlayback(): Promise<void> {
    try {
      this.isPlaying = false;
      this.playbackQueue = [];

      if (this.nativeAudioInitialized && NativePTTAudio.isAvailable()) {
        await NativePTTAudio.stopPlayback();
      }

      console.log('PTT playback stopped');
    } catch (error) {
      console.error('Error stopping PTT playback:', error);
    }
  }

  /**
   * Release audio resources
   * Call this when cleaning up
   */
  async release(): Promise<void> {
    try {
      await this.stopPlayback();

      if (this.nativeAudioInitialized && NativePTTAudio.isAvailable()) {
        await NativePTTAudio.release();
        this.nativeAudioInitialized = false;
      }

      console.log('PTT audio resources released');
    } catch (error) {
      console.error('Error releasing PTT audio:', error);
    }
  }

  /**
   * Check if currently streaming
   */
  get streaming(): boolean {
    return this.isStreaming;
  }
}

export const pttStreamService = new PTTStreamService();
