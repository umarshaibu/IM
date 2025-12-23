import { Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { NativeCallSound } from './NativeCallSound';

/**
 * Service to handle call-related sounds (ringtones, call tones, etc.)
 */
class CallSoundService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isPlaying: boolean = false;
  private currentSound: 'outgoing' | 'incoming' | 'busy' | 'ended' | null = null;
  private playbackSubscription: any = null;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
  }

  /**
   * Get the platform-specific path for a sound file
   * For Android raw resources, the path format is: android.resource://[package]/raw/[filename_without_extension]
   */
  private getSoundPath(soundName: string): string {
    if (Platform.OS === 'android') {
      // For raw resources on Android, just use the filename without extension
      // react-native-audio-recorder-player expects this format for raw resources
      const name = soundName.replace('.mp3', '');
      return name;
    } else {
      // On iOS, use the full filename with the Sounds bundle path
      return `Sounds/${soundName}`;
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
      const soundPath = this.getSoundPath('ringtone_outgoing.mp3');
      console.log('Playing outgoing tone:', soundPath);

      // Play the sound
      await this.audioRecorderPlayer.startPlayer(soundPath);
      await this.audioRecorderPlayer.setVolume(1.0);

      // Set up looping - the ringback tone should loop until answered or cancelled
      this.playbackSubscription = this.audioRecorderPlayer.addPlayBackListener((e) => {
        // When sound ends, restart it for looping
        if (e.currentPosition >= e.duration - 200 && this.isPlaying && this.currentSound === 'outgoing') {
          // Small delay before restarting
          setTimeout(async () => {
            if (this.isPlaying && this.currentSound === 'outgoing') {
              try {
                await this.audioRecorderPlayer.stopPlayer();
                await this.audioRecorderPlayer.startPlayer(soundPath);
              } catch (err) {
                console.log('Error restarting outgoing tone:', err);
              }
            }
          }, 500);
        }
      });
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
      const soundPath = this.getSoundPath('ringtone_incoming.mp3');
      console.log('Playing incoming ringtone:', soundPath);

      await this.audioRecorderPlayer.startPlayer(soundPath);
      await this.audioRecorderPlayer.setVolume(1.0);

      // Set up looping for incoming ringtone
      this.playbackSubscription = this.audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration - 200 && this.isPlaying && this.currentSound === 'incoming') {
          setTimeout(async () => {
            if (this.isPlaying && this.currentSound === 'incoming') {
              try {
                await this.audioRecorderPlayer.stopPlayer();
                await this.audioRecorderPlayer.startPlayer(soundPath);
              } catch (err) {
                console.log('Error restarting incoming ringtone:', err);
              }
            }
          }, 300);
        }
      });
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
      const soundPath = this.getSoundPath('tone_busy.mp3');
      console.log('Playing busy tone:', soundPath);

      await this.audioRecorderPlayer.startPlayer(soundPath);
      await this.audioRecorderPlayer.setVolume(1.0);

      // Busy tone plays once then stops
      this.playbackSubscription = this.audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration - 100) {
          this.stopAllSounds();
        }
      });
    } catch (error) {
      console.error('Error playing busy tone:', error);
      this.isPlaying = false;
      this.currentSound = null;
    }
  }

  /**
   * Play the call ended tone
   * Note: This is a short beep sound to indicate call has ended
   * If the sound file fails to load, we silently handle it
   */
  async playEndedTone(): Promise<void> {
    await this.stopAllSounds();
    this.currentSound = 'ended';
    this.isPlaying = true;

    try {
      const soundPath = this.getSoundPath('tone_ended.mp3');
      console.log('Playing ended tone:', soundPath);

      await this.audioRecorderPlayer.startPlayer(soundPath);
      await this.audioRecorderPlayer.setVolume(1.0);

      // End tone plays once
      this.playbackSubscription = this.audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition >= e.duration - 100) {
          this.stopAllSounds();
        }
      });
    } catch (error) {
      // Silently handle error for ended tone - it's not critical
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
      if (this.playbackSubscription) {
        this.audioRecorderPlayer.removePlayBackListener();
        this.playbackSubscription = null;
      }
      await this.audioRecorderPlayer.stopPlayer();
    } catch (error) {
      // Ignore errors when stopping (might not be playing)
    }

    // Also stop native ringtone (Android) - this handles the case
    // where the ringtone was started by native Firebase service
    if (Platform.OS === 'android') {
      await NativeCallSound.stopRingtone();
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
