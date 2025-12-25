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
import { initializeSignalR, declineCall, joinCall } from './src/services/signalr';
import {
  initializeNotifications,
  setupForegroundHandler,
  setupNotificationListeners,
  NotificationData,
} from './src/services/notifications';
import { CallManager } from './src/services/CallManager';
import { initializeVoipPush, setVoipCallHandler, VoipCallData } from './src/services/VoipPushService';
import { nativeCallEventService, NativeCallEventData } from './src/services/NativeCallEvent';
import { ThemeProvider, useTheme, NotificationProvider } from './src/context';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'could not determine track dimensions',
  '[🍉] JSI SQLiteAdapter not available',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Inner app component that can use theme context
const AppContent: React.FC = () => {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { setIncomingCall, clearIncomingCall } = useCallStore();
  const { colors, isDark } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appState = useRef(AppState.currentState);

  // Initialize notifications, CallManager, and VoIP push
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeNotifications();
        console.log('Notifications initialized successfully');

        // Initialize CallManager for CallKit/ConnectionService
        await CallManager.initialize();
        console.log('CallManager initialized successfully');

        // Set up CallManager callbacks
        CallManager.setCallbacks({
          onAnswerCall: async (callId: string) => {
            console.log('CallManager: Answer call', callId);
            try {
              const result = await joinCall(callId);
              clearIncomingCall();
              navigationRef.current?.navigate('Call', {
                callId,
                conversationId: result.conversationId || '',
                type: result.type === 'Video' ? 'Video' : 'Voice',
                isIncoming: true,
                roomToken: result.roomToken,
                roomId: result.roomId,
                liveKitUrl: result.liveKitUrl,
              });
            } catch (error) {
              console.error('Failed to join call from CallManager:', error);
            }
          },
          onEndCall: async (callId: string) => {
            console.log('CallManager: End call', callId);
            try {
              await declineCall(callId);
              clearIncomingCall();
            } catch (error) {
              console.error('Failed to decline call from CallManager:', error);
            }
          },
          onMuteCall: (callId: string, muted: boolean) => {
            console.log('CallManager: Mute call', callId, muted);
            // This will be handled by the CallScreen component
          },
        });

        // Initialize VoIP push for iOS
        if (Platform.OS === 'ios') {
          await initializeVoipPush();
          console.log('VoIP push initialized successfully');

          // Handle VoIP call events
          setVoipCallHandler((callData: VoipCallData) => {
            console.log('VoIP call received:', callData);
            setIncomingCall({
              id: callData.callId,
              conversationId: callData.conversationId,
              initiatorId: callData.callerId,
              initiatorName: callData.callerName,
              type: callData.callType,
              status: 'Ringing',
              participants: [],
              startedAt: new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    if (isAuthenticated) {
      initNotifications();
    }

    return () => {
      CallManager.cleanup();
    };
  }, [isAuthenticated, clearIncomingCall, setIncomingCall]);

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
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={colors.header}
      />
      <NavigationContainer ref={navigationRef}>
        {isAuthenticated && <IncomingCallListener />}
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

// Main App component with all providers
const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;
