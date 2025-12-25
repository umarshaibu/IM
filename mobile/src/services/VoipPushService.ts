import { Platform } from 'react-native';
import VoipPushNotification from 'react-native-voip-push-notification';
import { CallManager } from './CallManager';
import { notificationsApi } from './api';

// VoIP push notification handlers
let onVoipCallReceived: ((callData: VoipCallData) => void) | null = null;

export interface VoipCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callType: 'Voice' | 'Video';
  conversationId: string;
  uuid: string;
}

/**
 * Initialize VoIP push notifications (iOS only)
 * This enables the app to receive VoIP pushes that wake the device
 * even when the app is terminated.
 */
export const initializeVoipPush = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    console.log('VoIP push is iOS only, skipping initialization');
    return;
  }

  // Initialize CallManager first
  await CallManager.initialize();

  // Register for VoIP notifications
  VoipPushNotification.registerVoipToken();

  // Handle VoIP token registration
  VoipPushNotification.addEventListener('register', async (token: string) => {
    console.log('VoIP push token:', token);

    // Register the VoIP token with the backend
    try {
      await registerVoipToken(token);
    } catch (error) {
      console.error('Failed to register VoIP token:', error);
    }
  });

  // Handle incoming VoIP notification
  VoipPushNotification.addEventListener(
    'notification',
    (notification: any) => {
      console.log('VoIP notification received:', notification);

      // The call is already displayed by AppDelegate.mm via CallKit
      // This is called after the call is shown
      // We can use this to pass the call data to the React Native app

      const callData: VoipCallData = {
        callId: notification.callId,
        callerId: notification.callerId,
        callerName: notification.callerName || 'Unknown Caller',
        callType: notification.callType || 'Voice',
        conversationId: notification.conversationId,
        uuid: notification.uuid || '',
      };

      if (onVoipCallReceived) {
        onVoipCallReceived(callData);
      }
    }
  );

  // Handle remote notification fetch completion
  VoipPushNotification.addEventListener(
    'didLoadWithEvents',
    (events: any[]) => {
      if (!events || !Array.isArray(events) || events.length < 1) {
        return;
      }

      // Process any queued events
      for (const event of events) {
        console.log('VoIP didLoadWithEvents:', event);
        if (event.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
          // Token registered
        } else if (event.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
          // Notification received while app was launching
          const notification = event.data;
          const callData: VoipCallData = {
            callId: notification.callId,
            callerId: notification.callerId,
            callerName: notification.callerName || 'Unknown Caller',
            callType: notification.callType || 'Voice',
            conversationId: notification.conversationId,
            uuid: notification.uuid || '',
          };

          if (onVoipCallReceived) {
            onVoipCallReceived(callData);
          }
        }
      }
    }
  );

  console.log('VoIP push initialized');
};

/**
 * Register VoIP token with the backend
 */
const registerVoipToken = async (token: string): Promise<void> => {
  try {
    // Register as a VoIP token (separate from regular FCM token)
    await notificationsApi.registerVoip(token, 'iOS');
    console.log('VoIP token registered with backend');
  } catch (error) {
    console.error('Failed to register VoIP token with backend:', error);
    throw error;
  }
};

/**
 * Set callback for when a VoIP call is received
 */
export const setVoipCallHandler = (
  handler: (callData: VoipCallData) => void
): void => {
  onVoipCallReceived = handler;
};

/**
 * Remove VoIP call handler
 */
export const removeVoipCallHandler = (): void => {
  onVoipCallReceived = null;
};

/**
 * Cleanup VoIP push listeners
 */
export const cleanupVoipPush = (): void => {
  if (Platform.OS === 'ios') {
    VoipPushNotification.removeEventListener('register');
    VoipPushNotification.removeEventListener('notification');
    VoipPushNotification.removeEventListener('didLoadWithEvents');
  }
  onVoipCallReceived = null;
};

export default {
  initializeVoipPush,
  setVoipCallHandler,
  removeVoipCallHandler,
  cleanupVoipPush,
};
