import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../utils/theme';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ServiceNumberScreen from '../screens/auth/ServiceNumberScreen';
import TokenVerificationScreen from '../screens/auth/TokenVerificationScreen';

// Main Screens
import MainTabNavigator from './MainTabNavigator';
import ChatScreen from '../screens/chat/ChatScreen';
import GroupInfoScreen from '../screens/chat/GroupInfoScreen';
import ContactInfoScreen from '../screens/chat/ContactInfoScreen';
import NewChatScreen from '../screens/chat/NewChatScreen';
import NewGroupScreen from '../screens/chat/NewGroupScreen';
import MediaViewerScreen from '../screens/chat/MediaViewerScreen';
import SearchScreen from '../screens/chat/SearchScreen';
import ForwardMessageScreen from '../screens/chat/ForwardMessageScreen';
import MediaGalleryScreen from '../screens/chat/MediaGalleryScreen';
import CallScreen from '../screens/call/CallScreen';
import IncomingCallScreen from '../screens/call/IncomingCallScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import BlockedUsersScreen from '../screens/settings/BlockedUsersScreen';
import StatusViewerScreen from '../screens/status/StatusViewerScreen';
import CreateStatusScreen from '../screens/status/CreateStatusScreen';

export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  ServiceNumber: undefined;
  TokenVerification: {
    serviceNumber: string;
    fullName: string;
    maskedEmail?: string;
    maskedPhone?: string;
  };

  // Main
  MainTabs: undefined;
  Chat: { conversationId: string; title?: string };
  GroupInfo: { conversationId: string };
  ContactInfo: { userId: string };
  NewChat: undefined;
  NewGroup: undefined;
  MediaViewer: {
    mediaUrl: string;
    mediaType: string;
    senderName?: string;
    timestamp?: string;
  };
  MediaGallery: { conversationId: string };
  Search: undefined;
  ForwardMessage: { messageId: string };
  Call: {
    callId?: string;
    conversationId?: string;
    type: 'Voice' | 'Video';
    isIncoming?: boolean;
    // Pre-fetched room token from native code (when call was answered via native API)
    roomToken?: string;
    roomId?: string;
    liveKitUrl?: string;
  };
  IncomingCall: {
    callId: string;
    callerName: string;
    callerAvatar?: string;
    callType: 'Voice' | 'Video';
    conversationId: string;
  };
  Profile: undefined;
  Privacy: undefined;
  BlockedUsers: undefined;
  StatusViewer: { userId: string };
  CreateStatus: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsInitialized(true);
    };
    init();
  }, [initialize]);

  if (!isInitialized || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.textLight,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitleVisible: false, // Hide back button title on iOS
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceNumber" component={ServiceNumberScreen} options={{ title: 'Service Number' }} />
          <Stack.Screen name="TokenVerification" component={TokenVerificationScreen} options={{ title: 'Verification' }} />
        </>
      ) : (
        // Main Stack
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.title || 'Chat' })} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: 'Group Info' }} />
          <Stack.Screen name="ContactInfo" component={ContactInfoScreen} options={{ title: 'Contact Info' }} />
          <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Chat' }} />
          <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ title: 'New Group' }} />
          <Stack.Screen name="MediaViewer" component={MediaViewerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MediaGallery" component={MediaGalleryScreen} options={{ title: 'Media' }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
          <Stack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ title: 'Forward to...' }} />
          <Stack.Screen name="Call" component={CallScreen} options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen
            name="IncomingCall"
            component={IncomingCallScreen}
            options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: 'Blocked Users' }} />
          <Stack.Screen name="StatusViewer" component={StatusViewerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateStatus" component={CreateStatusScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
