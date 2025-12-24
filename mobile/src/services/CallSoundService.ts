import { Platform } from 'react-native';
import { NativeCallSound } from './NativeCallSound';

/**
 * Service to handle call-related sounds (ringtones, call tones, etc.)
 * Uses native Android MediaPlayer for reliable playback on Android
 */
class CallSoundService {
  private isPlaying: boolean = false;
  private currentSound: 'outgoing' | 'incoming' | 'busy' | 'ended' | null = null;

  constructor() {
    // No initialization needed
  }

  /**
   * Play the outgoing call tone (ringback tone)
   * This is played when calling someone and waiting for them to answer
   */
  async playOutgoingTone(): Promise<void> {
    if (this.isPlaying && this.currentSound === 'outgoing') {
      return; // Already playing
    }

    await this.stopAllSounds();
    this.currentSound = 'outgoing';
    this.isPlaying = true;

    try {
      console.log('Playing outgoing tone');
      if (Platform.OS === 'android') {
        // Use native module for Android - plays ringtone_outgoing from raw resources
        await NativeCallSound.playSound('ringtone_outgoing', true);
      } else {
        // iOS: TODO - implement with AVFoundation
        console.log('iOS sound playback not yet implemented');
      }
    } catch (error) {
      console.error('Error playing outgoing tone:', error);
      this.isPlaying = false;
      this.currentSound = null;
    }
  }

  /**
   * Play the incoming call ringtone
   * This is played when receiving a call
   */
  async playIncomingRingtone(): Promise<void> {
    if (this.isPlaying && this.currentSound === 'incoming') {
      return; // Already playing
    }

    await this.stopAllSounds();
    this.currentSound = 'incoming';
    this.isPlaying = true;

    try {
      console.log('Playing incoming ringtone');
      if (Platform.OS === 'android') {
        await NativeCallSound.playSound('ringtone_incoming', true);
      } else {
        console.log('iOS sound playback not yet implemented');
      }
    } catch (error) {
      console.error('Error playing incoming ringtone:', error);
      this.isPlaying = false;
      this.currentSound = null;
    }
  }

  /**
   * Play the busy tone
   * This is played when the call cannot be connected
   */
  async playBusyTone(): Promise<void> {
    await this.stopAllSounds();
    this.currentSound = 'busy';
    this.isPlaying = true;

    try {
      console.log('Playing busy tone');
      if (Platform.OS === 'android') {
        // Play once, not looping
        await NativeCallSound.playSound('tone_busy', false);
      } else {
        console.log('iOS sound playback not yet implemented');
      }

      // Auto-clear state after a short delay for non-looping sounds
      setTimeout(() => {
        if (this.currentSound === 'busy') {
          this.isPlaying = false;
          this.currentSound = null;
        }
      }, 3000);
    } catch (error) {
      console.error('Error playing busy tone:', error);
      this.isPlaying = false;
      this.currentSound = null;
    }
  }

  /**
   * Play the call ended tone
   * Note: This is a short beep sound to indicate call has ended
   */
  async playEndedTone(): Promise<void> {
    await this.stopAllSounds();
    this.currentSound = 'ended';
    this.isPlaying = true;

    try {
      console.log('Playing ended tone');
      if (Platform.OS === 'android') {
        await NativeCallSound.playSound('tone_ended', false);
      } else {
        console.log('iOS sound playback not yet implemented');
      }

      // Auto-clear state after a short delay
      setTimeout(() => {
        if (this.currentSound === 'ended') {
          this.isPlaying = false;
          this.currentSound = null;
        }
      }, 2000);
    } catch (error) {
      console.log('Note: Could not play ended tone:', error);
      this.isPlaying = false;
      this.currentSound = null;
    }
  }

  /**
   * Stop all sounds
   */
  async stopAllSounds(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Stop the native sound player
        await NativeCallSound.stopSound();
        // Also stop the ringtone (in case it was started by native notification service)
        await NativeCallSound.stopRingtone();
      }
    } catch (error) {
      console.log('Error stopping sounds:', error);
    }

    this.isPlaying = false;
    this.currentSound = null;
  }

  /**
   * Check if any sound is currently playing
   */
  isAnyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current playing sound type
   */
  getCurrentSound(): string | null {
    return this.currentSound;
  }
}

// Export singleton instance
export const callSoundService = new CallSoundService();
export default callSoundService;
