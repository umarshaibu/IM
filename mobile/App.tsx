import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox, AppState, AppStateStatus, Platform } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator, { RootStackParamList } from './src/navigation/RootNavigator';
import IncomingCallListener from './src/components/IncomingCallListener';
import { useAuthStore } from './src/stores/authStore';
import { useCallStore } from './src/stores/callStore';
import { initializeSignalR, declineCall } from './src/services/signalr';
import {
  initializeNotifications,
  setupForegroundHandler,
  setupNotificationListeners,
  NotificationData,
} from './src/services/notifications';
import { nativeCallEventService, NativeCallEventData } from './src/services/NativeCallEvent';
import { COLORS } from './src/utils/theme';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'could not determine track dimensions',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { setIncomingCall, clearIncomingCall } = useCallStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appState = useRef(AppState.currentState);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeNotifications();
        console.log('Notifications initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    if (isAuthenticated) {
      initNotifications();
    }
  }, [isAuthenticated]);

  // Handle native call events (from Android native notification actions)
  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== 'android') return;

    const handleNativeCallEvent = async (event: NativeCallEventData) => {
      console.log('Native call event received:', event);

      if (event.action === 'decline' && event.callId) {
        // User declined call from native notification
        console.log('Declining call from native notification:', event.callId);
        try {
          await declineCall(event.callId);
          clearIncomingCall();
        } catch (error) {
          console.error('Error declining call:', error);
        }
      } else if (event.action === 'answer' && event.callId) {
        // User answered call from native notification - navigate to call screen
        console.log('Answering call from native notification:', event.callId);
        console.log('Room token from native:', event.roomToken ? 'present' : 'not present');
        clearIncomingCall();
        navigationRef.current?.navigate('Call', {
          callId: event.callId,
          conversationId: event.conversationId,
          type: event.callType === 'Video' ? 'Video' : 'Voice',
          isIncoming: true,
          // Pass room token data from native join call (if available)
          roomToken: event.roomToken,
          roomId: event.roomId,
          liveKitUrl: event.liveKitUrl,
        });
      } else if (event.action === 'incoming' && event.callId) {
        // App opened from native notification - show incoming call screen
        console.log('Showing incoming call screen from native notification');
        navigationRef.current?.navigate('IncomingCall', {
          callId: event.callId,
          callerName: event.callerName || 'Unknown',
          callerAvatar: undefined,
          callType: event.callType === 'Video' ? 'Video' : 'Voice',
          conversationId: event.conversationId || '',
        });
      }
    };

    // Start listening for native events
    const unsubscribe = nativeCallEventService.startListening(handleNativeCallEvent);

    // Check for pending call data (when app was launched from notification)
    const checkPendingData = async () => {
      const pendingData = await nativeCallEventService.getPendingCallData();
      if (pendingData) {
        console.log('Found pending call data:', pendingData);
        handleNativeCallEvent(pendingData);
      }
    };
    checkPendingData();

    return unsubscribe;
  }, [isAuthenticated, clearIncomingCall]);

  // Handle notification interactions
  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle notification press
    const handleNotificationPress = (data: NotificationData) => {
      console.log('Notification pressed:', data);

      if (data.type === 'call' && data.callId && data.conversationId) {
        // Navigate to incoming call screen
        navigationRef.current?.navigate('IncomingCall', {
          callId: data.callId,
          callerName: data.callerName || data.title,
          callerAvatar: data.imageUrl,
          callType: data.callType === 'Video' ? 'Video' : 'Voice',
          conversationId: data.conversationId,
        });
      } else if (data.type === 'message' && data.conversationId) {
        // Navigate to chat screen
        navigationRef.current?.navigate('Chat', {
          conversationId: data.conversationId,
        });
      }
    };

    const unsubscribeListeners = setupNotificationListeners(handleNotificationPress);

    // Handle foreground messages
    const unsubscribeForeground = setupForegroundHandler((notification) => {
      console.log('Foreground notification:', notification);

      // For call notifications, also update the call store
      if (notification.type === 'call' && notification.callId) {
        setIncomingCall({
          id: notification.callId,
          conversationId: notification.conversationId || '',
          initiatorId: notification.callerId || notification.userId || '',
          initiatorName: notification.callerName || notification.title,
          type: notification.callType === 'Video' ? 'Video' : 'Voice',
          status: 'Ringing',
          participants: [],
          startedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      unsubscribeListeners();
      unsubscribeForeground();
    };
  }, [isAuthenticated, setIncomingCall]);

  // Initialize SignalR
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('Initializing SignalR with token...');
      initializeSignalR(accessToken)
        .then(() => console.log('SignalR initialized successfully'))
        .catch((error) => console.error('SignalR initialization failed:', error));
    }
  }, [isAuthenticated, accessToken]);

  // Handle app state changes for reconnecting
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated &&
        accessToken
      ) {
        // Reconnect SignalR when app comes to foreground
        console.log('App came to foreground, reconnecting SignalR...');
        initializeSignalR(accessToken).catch(console.error);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, accessToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={COLORS.primary}
            />
            {isAuthenticated && <IncomingCallListener />}
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;
