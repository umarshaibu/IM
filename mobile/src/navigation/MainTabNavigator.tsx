import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/theme';
import { useChatStore } from '../stores/chatStore';

import ChatsScreen from '../screens/main/ChatsScreen';
import StatusScreen from '../screens/main/StatusScreen';
import CallsScreen from '../screens/main/CallsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

export type MainTabParamList = {
  Chats: undefined;
  Status: undefined;
  Calls: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const unreadCount = useChatStore((state) => state.getUnreadCount());

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.textLight,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: COLORS.surface },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Chats':
              iconName = focused ? 'message-text' : 'message-text-outline';
              break;
            case 'Status':
              iconName = focused ? 'view-carousel' : 'view-carousel-outline';
              break;
            case 'Calls':
              iconName = focused ? 'phone-in-talk' : 'phone-in-talk-outline';
              break;
            case 'Settings':
              iconName = focused ? 'account-cog' : 'account-cog-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          title: 'Chats',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen name="Status" component={StatusScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
