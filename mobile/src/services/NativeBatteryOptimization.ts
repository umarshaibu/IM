import { NativeModules, Platform } from 'react-native';

const { BatteryOptimization } = NativeModules;

/**
 * Native module to handle battery optimization settings on Android.
 * Critical for ensuring calls work when app is in background or device is locked.
 */
export const NativeBatteryOptimization = {
  /**
   * Check if app is exempt from battery optimization
   */
  isIgnoringBatteryOptimizations: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.isIgnoringBatteryOptimizations();
      } catch (error) {
        console.log('Error checking battery optimization:', error);
        return false;
      }
    }
    // iOS doesn't have battery optimization like Android
    return true;
  },

  /**
   * Request battery optimization exemption
   * Opens system dialog asking user to exempt the app
   */
  requestIgnoreBatteryOptimizations: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.requestIgnoreBatteryOptimizations();
      } catch (error) {
        console.log('Error requesting battery optimization exemption:', error);
        return false;
      }
    }
    return true;
  },

  /**
   * Open app-specific battery settings
   */
  openAppBatterySettings: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.openAppBatterySettings();
      } catch (error) {
        console.log('Error opening app battery settings:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Get device manufacturer name
   */
  getDeviceManufacturer: async (): Promise<string> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.getDeviceManufacturer();
      } catch (error) {
        console.log('Error getting device manufacturer:', error);
        return 'unknown';
      }
    }
    return 'apple';
  },

  /**
   * Check if device has aggressive battery management (Xiaomi, Huawei, etc.)
   */
  hasAggressiveBatteryManagement: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.hasAggressiveBatteryManagement();
      } catch (error) {
        console.log('Error checking aggressive battery management:', error);
        return false;
      }
    }
    return false;
  },

  /**
   * Open manufacturer-specific battery settings
   * Useful for phones with their own battery management (Xiaomi, Huawei, Samsung, etc.)
   */
  openManufacturerBatterySettings: async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BatteryOptimization) {
      try {
        return await BatteryOptimization.openManufacturerBatterySettings();
      } catch (error) {
        console.log('Error opening manufacturer battery settings:', error);
        return false;
      }
    }
    return false;
  },
};

export default NativeBatteryOptimization;
