import { NativeModules, Platform } from 'react-native';

const { PTTAudioModule } = NativeModules;

/**
 * Native module wrapper for PTT audio playback
 * Handles real-time PCM audio streaming for Push-to-Talk feature
 * Supports both Android and iOS platforms
 */
export const NativePTTAudio = {
  /**
   * Initialize the audio player
   * Must be called before playing audio chunks
   */
  init: async (): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.init();
      } catch (error) {
        console.error('Error initializing PTT audio:', error);
        return false;
      }
    }
    console.warn('PTTAudioModule not available on this platform');
    return false;
  },

  /**
   * Start playback
   * Initializes the playback thread to process audio queue
   */
  startPlayback: async (): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.startPlayback();
      } catch (error) {
        console.error('Error starting PTT playback:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Play an audio chunk
   * @param audioDataBase64 Base64 encoded PCM audio data (16-bit, 16kHz, mono)
   */
  playChunk: async (audioDataBase64: string): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.playChunk(audioDataBase64);
      } catch (error) {
        console.error('Error playing PTT chunk:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Stop playback
   * Clears the audio queue and stops the playback thread
   */
  stopPlayback: async (): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.stopPlayback();
      } catch (error) {
        console.error('Error stopping PTT playback:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Release audio resources
   * Should be called when PTT feature is no longer needed
   */
  release: async (): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.release();
      } catch (error) {
        console.error('Error releasing PTT audio:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Check if audio is currently playing
   */
  isPlaying: async (): Promise<boolean> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.isPlaying();
      } catch (error) {
        console.error('Error checking PTT playing state:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Get the current queue size (for debugging)
   */
  getQueueSize: async (): Promise<number> => {
    if (PTTAudioModule) {
      try {
        return await PTTAudioModule.getQueueSize();
      } catch (error) {
        console.error('Error getting queue size:', error);
        return 0;
      }
    }
    return 0;
  },

  /**
   * Check if the native module is available
   */
  isAvailable: (): boolean => {
    return PTTAudioModule != null;
  },
};

export default NativePTTAudio;
