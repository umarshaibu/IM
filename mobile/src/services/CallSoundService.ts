import { Platform } from 'react-native';
import { NativeCallSound } from './NativeCallSound';

// Sound file mappings for iOS bundle resources
const IOS_SOUND_FILES: Record<string, string> = {
  ringtone_outgoing: 'ringtone_outgoing',
  ringtone_incoming: 'ringtone_incoming',
  tone_busy: 'tone_busy',
  tone_ended: 'tone_ended',
};

// We'll use react-native-audio-recorder-player for iOS playback
// since react-native-video requires a component
let iosAudioPlayer: any = null;

/**
 * Get or create the iOS audio player instance
 */
async function getIOSAudioPlayer(): Promise<any> {
  if (!iosAudioPlayer) {
    try {
      const AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
      iosAudioPlayer = new AudioRecorderPlayer();
    } catch (error) {
      console.error('Failed to initialize iOS audio player:', error);
      return null;
    }
  }
  return iosAudioPlayer;
}

/**
 * Service to handle call-related sounds (ringtones, call tones, etc.)
 * Uses native Android MediaPlayer for reliable playback on Android
 * Uses react-native-audio-recorder-player for iOS
 */
class CallSoundService {
  private isPlaying: boolean = false;
  private currentSound: 'outgoing' | 'incoming' | 'busy' | 'ended' | null = null;
  private iosLoopInterval: ReturnType<typeof setInterval> | null = null;
  private iosCurrentSoundPath: string | null = null;

  constructor() {
    // No initialization needed
  }

  /**
   * Play a sound on iOS using react-native-audio-recorder-player
   */
  private async playIOSSound(soundName: string, loop: boolean): Promise<void> {
    try {
      const player = await getIOSAudioPlayer();
      if (!player) {
        console.log('iOS audio player not available');
        return;
      }

      // Stop any currently playing sound
      await this.stopIOSSound();

      // Get the bundled sound file path
      // For iOS, bundled resources are accessed via the main bundle
      const soundPath = `${IOS_SOUND_FILES[soundName]}.mp3`;
      this.iosCurrentSoundPath = soundPath;

      console.log('iOS: Playing sound:', soundPath, 'loop:', loop);

      // Start playback
      await player.startPlayer(soundPath);

      if (loop) {
        // Set up looping by restarting when the sound ends
        player.addPlayBackListener((e: any) => {
          if (e.currentPosition >= e.duration - 100) {
            // Restart for looping
            player.seekToPlayer(0);
          }
        });
      } else {
        // For non-looping, stop when complete
        player.addPlayBackListener((e: any) => {
          if (e.currentPosition >= e.duration - 100) {
            this.stopIOSSound();
          }
        });
      }
    } catch (error) {
      console.error('Error playing iOS sound:', error);
    }
  }

  /**
   * Stop iOS sound playback
   */
  private async stopIOSSound(): Promise<void> {
    try {
      const player = await getIOSAudioPlayer();
      if (player) {
        player.removePlayBackListener();
        await player.stopPlayer();
      }
      this.iosCurrentSoundPath = null;
    } catch (error) {
      console.log('Error stopping iOS sound:', error);
    }
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
      } else if (Platform.OS === 'ios') {
        // iOS: Use react-native-audio-recorder-player
        await this.playIOSSound('ringtone_outgoing', true);
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
      } else if (Platform.OS === 'ios') {
        await this.playIOSSound('ringtone_incoming', true);
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
      } else if (Platform.OS === 'ios') {
        await this.playIOSSound('tone_busy', false);
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
      } else if (Platform.OS === 'ios') {
        await this.playIOSSound('tone_ended', false);
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
      } else if (Platform.OS === 'ios') {
        // Stop iOS sound playback
        await this.stopIOSSound();
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
