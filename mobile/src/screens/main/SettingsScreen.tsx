import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import { authApi } from '../../services/api';
import { disconnectSignalR } from '../../services/signalr';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme, ThemeMode } from '../../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  disabled?: boolean;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Setting item component with theme support
  const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    iconColor = colors.primary,
    iconBgColor,
    label,
    subtitle,
    onPress,
    showChevron = true,
    rightComponent,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={disabled || !onPress}
    >
      <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor || iconColor + '15' }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent || (showChevron && onPress && (
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      ))}
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
            await disconnectSignalR();
            await logout();
          },
        },
      ]
    );
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const getThemeSubtitle = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `System (${isDark ? 'Dark' : 'Light'})`;
    }
  };

  const showThemeOptions = () => {
    Alert.alert(
      'Choose Theme',
      'Select your preferred appearance',
      [
        {
          text: 'Light',
          onPress: () => handleThemeChange('light'),
        },
        {
          text: 'Dark',
          onPress: () => handleThemeChange('dark'),
        },
        {
          text: 'System Default',
          onPress: () => handleThemeChange('system'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Avatar
            uri={user?.profilePictureUrl}
            name={user?.displayName || user?.fullName || ''}
            size={72}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.displayName || user?.fullName || 'User'}
            </Text>
            <Text style={[styles.profileAbout, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.about || 'Hey there! I am using IM'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.qrButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => navigation.navigate('QRCode')}
          >
            <Icon name="qrcode-scan" size={22} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="key-variant"
              label="Privacy"
              subtitle="Last seen, profile photo, about"
              onPress={() => navigation.navigate('Privacy')}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="shield-check-outline"
              iconColor="#34C759"
              label="Security"
              subtitle="Two-step verification, encryption"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="cancel"
              iconColor={colors.error}
              label="Blocked Users"
              subtitle="Manage blocked contacts"
              onPress={() => navigation.navigate('BlockedUsers')}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon={isDark ? 'weather-night' : 'white-balance-sunny'}
              iconColor={isDark ? '#FFD60A' : '#FF9F0A'}
              label="Theme"
              subtitle={getThemeSubtitle()}
              onPress={showThemeOptions}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="wallpaper"
              iconColor="#AF52DE"
              label="Chat Wallpaper"
              subtitle="Change chat background"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Chats Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Chats</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="message-text-outline"
              iconColor="#007AFF"
              label="Chat Settings"
              subtitle="Font size, enter key sends"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="cloud-upload-outline"
              iconColor="#5856D6"
              label="Chat Backup"
              subtitle="Backup and restore chats"
              onPress={() => navigation.navigate('ChatBackup')}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="history"
              iconColor="#FF9500"
              label="Chat History"
              subtitle="Export, clear chats"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="bell-outline"
              iconColor="#FF3B30"
              label="Message Notifications"
              subtitle="Sounds, vibration, pop-ups"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="account-group-outline"
              iconColor="#32ADE6"
              label="Group Notifications"
              subtitle="Sounds, vibration"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="phone-ring-outline"
              iconColor={colors.callAccept}
              label="Call Notifications"
              subtitle="Ringtone, vibration"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Storage & Network Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Storage & Data</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="database-outline"
              iconColor="#64D2FF"
              label="Storage & Data"
              subtitle="Manage storage and network"
              onPress={() => navigation.navigate('StorageManagement')}
            />
          </View>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Help & Support</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="help-circle-outline"
              iconColor="#007AFF"
              label="Help Center"
              subtitle="FAQ, contact support"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="file-document-outline"
              iconColor="#8E8E93"
              label="Terms & Privacy Policy"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <SettingItem
              icon="information-outline"
              iconColor="#8E8E93"
              label="App Info"
              subtitle="Version 1.0.0"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Invite Section */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingItem
              icon="share-variant-outline"
              iconColor={colors.primary}
              label="Invite Friends"
              subtitle="Share the app with friends"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.logoutIconContainer, { backgroundColor: colors.error + '15' }]}>
            <Icon name="logout" size={20} color={colors.error} />
          </View>
          <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Icon name="lock-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Your messages are end-to-end encrypted
          </Text>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.version, { color: colors.textTertiary }]}>IM v1.0.0</Text>
          <Text style={[styles.copyright, { color: colors.textTertiary }]}>
            Made with care for your organization
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  profileName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileAbout: {
    fontSize: FONTS.sizes.sm,
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  sectionContent: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  footerText: {
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.xs,
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  version: {
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  copyright: {
    fontSize: FONTS.sizes.xs,
  },
});

export default SettingsScreen;
