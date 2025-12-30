import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { useChatStore } from '../stores/chatStore';

import ChatsScreen from '../screens/main/ChatsScreen';
import CallsScreen from '../screens/main/CallsScreen';
import ChannelsScreen from '../screens/main/ChannelsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

export type MainTabParamList = {
  Chats: undefined;
  Calls: undefined;
  Channels: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
  badge?: number;
  badgeColor: string;
  badgeTextColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, size, badge, badgeColor, badgeTextColor }) => (
  <View style={staticStyles.iconContainer}>
    <Icon name={name} size={size} color={color} />
    {badge !== undefined && badge > 0 && (
      <View style={[staticStyles.badge, { backgroundColor: badgeColor }]}>
        <Text style={[staticStyles.badgeText, { color: badgeTextColor }]}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

const MainTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const unreadCount = useChatStore((state) => state.getUnreadCount());

  const tabBarStyle = useMemo(() => ({
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    height: 70,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    position: 'absolute' as const,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderTopColor: colors.divider,
  }), [colors]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: staticStyles.tabBarLabel,
        tabBarItemStyle: staticStyles.tabBarItem,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Chats':
              iconName = focused ? 'chat' : 'chat-outline';
              break;
            case 'Calls':
              iconName = focused ? 'phone' : 'phone-outline';
              break;
            case 'Channels':
              iconName = focused ? 'bullhorn' : 'bullhorn-outline';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'help';
          }

          if (route.name === 'Chats') {
            return (
              <TabIcon
                name={iconName}
                focused={focused}
                color={color}
                size={24}
                badge={unreadCount}
                badgeColor={colors.secondary}
                badgeTextColor={colors.textInverse}
              />
            );
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          title: 'Chats',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          title: 'Calls',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Channels"
        component={ChannelsScreen}
        options={{
          title: 'Channels',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const staticStyles = StyleSheet.create({
  tabBarLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: SPACING.xs,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainTabNavigator;
