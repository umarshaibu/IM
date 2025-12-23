import { NativeModules, Platform } from 'react-native';

const { CallSoundModule } = NativeModules;

/**
 * Native module to control call ringtone and notifications on Android
 * This is used when the app receives a call via Firebase when killed/backgrounded
 */
export const NativeCallSound = {
  /**
   * Stop the native ringtone and vibration
   * Call this when a call is answered, declined, or ended
   */
  stopRingtone: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && CallSoundModule) {
      try {
        return await CallSoundModule.stopRingtone();
      } catch (error) {
        console.log('Error stopping native ringtone:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Cancel the native call notification
   */
  cancelCallNotification: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && CallSoundModule) {
      try {
        return await CallSoundModule.cancelCallNotification();
      } catch (error) {
        console.log('Error cancelling call notification:', error);
        return false;
      }
    }
    return false;
  },
};

export default NativeCallSound;
