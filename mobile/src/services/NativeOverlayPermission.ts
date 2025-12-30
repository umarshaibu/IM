import { NativeModules, Platform } from 'react-native';

const { OverlayPermissionModule } = NativeModules;

/**
 * Service for managing the "Display over other apps" (SYSTEM_ALERT_WINDOW) permission.
 * This permission is required for showing the incoming call overlay on Android 10+.
 *
 * Without this permission:
 * - When screen is OFF: Full-screen intent will work
 * - When screen is ON: Only notification will show (user must tap to answer)
 *
 * With this permission:
 * - Full incoming call screen overlay will show regardless of screen state
 */

/**
 * Check if the app has permission to draw overlays
 */
export const canDrawOverlays = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !OverlayPermissionModule) {
    return true; // Not needed on iOS
  }

  try {
    return await OverlayPermissionModule.canDrawOverlays();
  } catch (error) {
    console.log('Error checking overlay permission:', error);
    return false;
  }
};

/**
 * Open system settings to allow user to grant overlay permission
 */
export const requestOverlayPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !OverlayPermissionModule) {
    return true; // Not needed on iOS
  }

  try {
    return await OverlayPermissionModule.requestOverlayPermission();
  } catch (error) {
    console.log('Error requesting overlay permission:', error);
    return false;
  }
};

/**
 * Check if overlay permission is needed on this Android version
 */
export const isOverlayPermissionNeeded = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !OverlayPermissionModule) {
    return false; // Not needed on iOS
  }

  try {
    return await OverlayPermissionModule.isOverlayPermissionNeeded();
  } catch (error) {
    console.log('Error checking if overlay permission needed:', error);
    return false;
  }
};

export default {
  canDrawOverlays,
  requestOverlayPermission,
  isOverlayPermissionNeeded,
};
