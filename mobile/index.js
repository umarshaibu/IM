// Polyfill for crypto.getRandomValues (required by tweetnacl)
import 'react-native-get-random-values';

// Polyfill for Buffer (required by tweetnacl-util)
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { AppRegistry, NativeModules, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  EventType,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  AndroidStyle,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Helper to stop native ringtone
const stopNativeRingtone = async () => {
  if (Platform.OS === 'android' && NativeModules.CallSoundModule) {
    try {
      await NativeModules.CallSoundModule.stopRingtone();
    } catch (e) {
      console.log('Error stopping native ringtone:', e);
    }
  }
};

// Handle background messages from Firebase
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message received:', remoteMessage);

  const { data } = remoteMessage;
  if (!data) return;

  // Handle incoming call notifications
  if (data.type === 'call') {
    // Delete the old channel if it exists (to update settings)
    // Then create a new one with proper ringtone settings
    try {
      await notifee.deleteChannel('calls');
    } catch (e) {
      // Channel might not exist, that's OK
    }

    // Create the calls channel with ringtone settings
    await notifee.createChannel({
      id: 'calls',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
      sound: 'ringtone',
      vibration: true,
      vibrationPattern: [500, 250, 500, 250],
      lights: true,
      lightColor: '#128C7E',
      bypassDnd: true,
    });

    // Display a call-style notification
    await notifee.displayNotification({
      id: `call-${data.callId}`,
      title: data.callerName || 'Incoming Call',
      body: `Incoming ${data.callType?.toLowerCase() || 'voice'} call`,
      data: {
        type: 'call',
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        conversationId: data.conversationId,
      },
      android: {
        channelId: 'calls',
        smallIcon: 'ic_call',
        largeIcon: 'ic_launcher',
        color: '#128C7E',
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: true,
        autoCancel: false,
        // Sound configuration - loop the ringtone
        sound: 'ringtone',
        loopSound: true,
        vibrationPattern: [500, 250, 500, 250],
        // Use foreground service for call notifications
        asForegroundService: true,
        // Full screen intent - this wakes the device and shows on lock screen
        fullScreenAction: {
          id: 'incoming-call',
          launchActivity: 'com.im.MainActivity',
        },
        pressAction: {
          id: 'answer',
          launchActivity: 'com.im.MainActivity',
        },
        actions: [
          {
            title: '❌ Decline',
            pressAction: { id: 'decline' },
          },
          {
            title: '✓ Answer',
            pressAction: { id: 'answer', launchActivity: 'com.im.MainActivity' },
          },
        ],
        // Style for call notifications
        style: {
          type: AndroidStyle.BIGTEXT,
          text: `${data.callerName || 'Someone'} is calling you`,
        },
        // Show timestamp
        showTimestamp: true,
        timestamp: Date.now(),
        // Keep notification at top
        onlyAlertOnce: false,
      },
      ios: {
        sound: 'ringtone.caf',
        critical: true,
        criticalVolume: 1.0,
        interruptionLevel: 'timeSensitive',
      },
    });

    console.log('Call notification displayed for:', data.callId);
  }

  // Handle message notifications
  if (data.type === 'message') {
    const { notification } = remoteMessage;
    await notifee.displayNotification({
      title: notification?.title || 'New Message',
      body: notification?.body || 'You have a new message',
      data: {
        type: 'message',
        conversationId: data.conversationId,
        messageId: data.messageId,
        senderId: data.senderId,
      },
      android: {
        channelId: 'messages',
        smallIcon: 'ic_notification',
        color: '#128C7E',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
  }
});

// Handle notification background events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Background notification event:', type, detail);

  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS) {
    const data = notification?.data;

    if (pressAction?.id === 'decline' && data?.callId) {
      // User declined the call from notification
      console.log('Call declined from notification:', data.callId);
      // Stop native ringtone
      await stopNativeRingtone();
      // The actual decline will be handled when the app opens
      await notifee.cancelNotification(notification?.id || '');
    } else if (pressAction?.id === 'answer' && data?.callId) {
      // User answered the call from notification
      console.log('Call answered from notification:', data.callId);
      // Stop native ringtone
      await stopNativeRingtone();
      await notifee.cancelNotification(notification?.id || '');
      // The navigation to CallScreen will be handled in App.tsx
    }
  }

  if (type === EventType.DISMISSED) {
    // Notification was dismissed
    console.log('Notification dismissed');
  }
});

AppRegistry.registerComponent(appName, () => App);
