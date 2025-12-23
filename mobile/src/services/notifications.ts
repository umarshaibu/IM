import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  EventType,
  Event,
} from '@notifee/react-native';
import { notificationsApi } from './api';

// Notification channels - must match backend AndroidNotification.ChannelId values
const CHANNEL_IDS = {
  MESSAGES: 'messages',
  CALLS: 'calls',
  GROUPS: 'groups',
  STATUS: 'status',
  GENERAL: 'general',
} as const;

// Initialize notification service
export const initializeNotifications = async (): Promise<void> => {
  // Request permission
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('Notification permission not granted');
    return;
  }

  // Create notification channels (Android)
  if (Platform.OS === 'android') {
    await createNotificationChannels();
  }

  // Register for remote messages on iOS (required before getToken)
  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
  }

  // Get FCM token
  const token = await messaging().getToken();
  console.log('FCM Token:', token);

  // Register token with backend
  await registerPushToken(token);

  // Listen for token refresh
  messaging().onTokenRefresh(async (newToken) => {
    console.log('FCM Token refreshed:', newToken);
    await registerPushToken(newToken);
  });
};

// Create Android notification channels
const createNotificationChannels = async (): Promise<void> => {
  await notifee.createChannel({
    id: CHANNEL_IDS.MESSAGES,
    name: 'Messages',
    description: 'New message notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  // Delete and recreate calls channel to ensure proper settings
  try {
    await notifee.deleteChannel(CHANNEL_IDS.CALLS);
  } catch (e) {
    // Channel might not exist, that's OK
  }

  await notifee.createChannel({
    id: CHANNEL_IDS.CALLS,
    name: 'Incoming Calls',
    description: 'Incoming call notifications with ringtone',
    importance: AndroidImportance.HIGH,
    sound: 'ringtone',
    vibration: true,
    vibrationPattern: [500, 250, 500, 250],
    lights: true,
    lightColor: '#128C7E',
    bypassDnd: true,
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.GROUPS,
    name: 'Group Messages',
    description: 'Group chat notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.STATUS,
    name: 'Status Updates',
    description: 'Status update notifications',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.GENERAL,
    name: 'General',
    description: 'General notifications',
    importance: AndroidImportance.DEFAULT,
  });
};

// Register push token with backend
const registerPushToken = async (token: string): Promise<void> => {
  try {
    const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';
    await notificationsApi.register(token, platform);
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
};

// Unregister push token
export const unregisterPushToken = async (): Promise<void> => {
  try {
    const token = await messaging().getToken();
    await notificationsApi.unregister(token);
    await messaging().deleteToken();
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
};

// Handle foreground messages
export const setupForegroundHandler = (
  onMessage: (notification: NotificationData) => void
): (() => void) => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message:', remoteMessage);

    const notificationData = parseNotification(remoteMessage);
    if (notificationData) {
      onMessage(notificationData);

      // Display local notification
      await displayLocalNotification(notificationData);
    }
  });

  return unsubscribe;
};

// Handle background messages
export const setupBackgroundHandler = (): void => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message:', remoteMessage);

    const notificationData = parseNotification(remoteMessage);
    if (notificationData) {
      await displayLocalNotification(notificationData);
    }
  });
};

// Handle notification interactions
export const setupNotificationListeners = (
  onNotificationPress: (data: NotificationData) => void
): (() => void) => {
  // When app is opened from notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        const data = parseNotification(remoteMessage);
        if (data) {
          onNotificationPress(data);
        }
      }
    });

  // When notification is pressed while app is in background
  const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    const data = parseNotification(remoteMessage);
    if (data) {
      onNotificationPress(data);
    }
  });

  // Notifee foreground events
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }: Event) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      onNotificationPress(detail.notification.data as unknown as NotificationData);
    }
  });

  return () => {
    unsubscribeOpened();
    unsubscribeNotifee();
  };
};

// Notification data interface
export interface NotificationData {
  type: 'message' | 'call' | 'group' | 'status' | 'general';
  conversationId?: string;
  messageId?: string;
  callId?: string;
  callerId?: string;
  callerName?: string;
  callType?: 'Voice' | 'Video';
  userId?: string;
  title: string;
  body: string;
  imageUrl?: string;
}

// Parse remote message to notification data
const parseNotification = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): NotificationData | null => {
  const { notification, data } = remoteMessage;

  if (!notification && !data) {
    return null;
  }

  return {
    type: (data?.type as NotificationData['type']) || 'general',
    conversationId: data?.conversationId as string,
    messageId: data?.messageId as string,
    callId: data?.callId as string,
    callerId: data?.callerId as string,
    callerName: data?.callerName as string,
    callType: data?.callType as 'Voice' | 'Video',
    userId: data?.userId || data?.senderId as string,
    title: notification?.title || (data?.callerName as string) || (data?.title as string) || 'IM',
    body: notification?.body || (data?.body as string) || '',
    imageUrl: notification?.android?.imageUrl || (data?.imageUrl as string),
  };
};

// Display local notification
const displayLocalNotification = async (data: NotificationData): Promise<void> => {
  const channelId = getChannelForType(data.type);

  await notifee.displayNotification({
    title: data.title,
    body: data.body,
    data: data as unknown as Record<string, string>,
    android: {
      channelId,
      smallIcon: 'ic_notification',
      color: '#128C7E',
      pressAction: {
        id: 'default',
      },
      ...(data.imageUrl && {
        largeIcon: data.imageUrl,
        style: {
          type: 0, // BigPictureStyle
          picture: data.imageUrl,
        },
      }),
    },
    ios: {
      sound: 'default',
      ...(data.imageUrl && {
        attachments: [{ url: data.imageUrl }],
      }),
    },
  });
};

// Display incoming call notification
export const displayCallNotification = async (
  callId: string,
  callerName: string,
  callerAvatar?: string,
  callType: 'Voice' | 'Video' = 'Voice'
): Promise<string> => {
  const notificationId = await notifee.displayNotification({
    id: `call-${callId}`,
    title: callerName,
    body: `Incoming ${callType.toLowerCase()} call`,
    data: {
      type: 'call',
      callId,
    },
    android: {
      channelId: CHANNEL_IDS.CALLS,
      smallIcon: 'ic_call',
      largeIcon: callerAvatar || 'ic_launcher',
      color: '#128C7E',
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      ongoing: true,
      autoCancel: false,
      // Sound and vibration
      sound: 'ringtone',
      loopSound: true,
      vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
      // Use foreground service for persistent notification
      asForegroundService: true,
      // Full screen intent for incoming calls - wakes the device
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
    },
    ios: {
      sound: 'ringtone.caf',
      critical: true,
      criticalVolume: 1.0,
      interruptionLevel: 'timeSensitive',
    },
  });

  return notificationId;
};

// Cancel notification
export const cancelNotification = async (notificationId: string): Promise<void> => {
  await notifee.cancelNotification(notificationId);
};

// Cancel all notifications
export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
};

// Get channel for notification type
const getChannelForType = (type: NotificationData['type']): string => {
  switch (type) {
    case 'message':
      return CHANNEL_IDS.MESSAGES;
    case 'call':
      return CHANNEL_IDS.CALLS;
    case 'group':
      return CHANNEL_IDS.GROUPS;
    case 'status':
      return CHANNEL_IDS.STATUS;
    default:
      return CHANNEL_IDS.GENERAL;
  }
};

// Check notification permissions
export const checkNotificationPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().hasPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
  return await notifee.getBadgeCount();
};

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
  await notifee.setBadgeCount(count);
};

// Increment badge count
export const incrementBadgeCount = async (): Promise<void> => {
  const current = await getBadgeCount();
  await setBadgeCount(current + 1);
};

// Clear badge count
export const clearBadgeCount = async (): Promise<void> => {
  await setBadgeCount(0);
};
