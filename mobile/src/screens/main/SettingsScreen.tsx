import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Avatar from '../../components/Avatar';
import { authApi } from '../../services/api';
import { disconnectSignalR } from '../../services/signalr';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor = COLORS.primary,
  iconBgColor = COLORS.primary + '15',
  label,
  subtitle,
  onPress,
  showChevron = true,
}) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingLabel}>{label}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {showChevron && <Icon name="chevron-right" size={22} color={COLORS.textMuted} />}
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, logout } = useAuthStore();

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Profile Card */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.profileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={user?.profilePictureUrl}
                name={user?.displayName || user?.fullName || ''}
                size={80}
              />
              <View style={styles.editBadge}>
                <Icon name="pencil" size={14} color={COLORS.primary} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.displayName || user?.fullName}
              </Text>
              <Text style={styles.profileAbout} numberOfLines={1}>
                {user?.about || 'Hey there! I am using IM'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="key-variant"
            label="Privacy"
            subtitle="Last seen, profile photo, about"
            onPress={() => navigation.navigate('Privacy')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="cancel"
            iconColor={COLORS.error}
            iconBgColor={COLORS.error + '15'}
            label="Blocked Users"
            subtitle="Manage blocked contacts"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </View>
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="bell-outline"
            iconColor="#FF9500"
            iconBgColor="#FF950015"
            label="Notifications"
            subtitle="Message, group & call tones"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="database-outline"
            iconColor="#5856D6"
            iconBgColor="#5856D615"
            label="Storage and Data"
            subtitle="Network usage, auto-download"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="translate"
            iconColor="#34C759"
            iconBgColor="#34C75915"
            label="Language"
            subtitle="English"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="help-circle-outline"
            iconColor="#007AFF"
            iconBgColor="#007AFF15"
            label="Help Center"
            subtitle="FAQ, contact us"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="information-outline"
            iconColor="#8E8E93"
            iconBgColor="#8E8E9315"
            label="About"
            subtitle="App info, licenses"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <View style={styles.logoutIconContainer}>
          <Icon name="logout" size={20} color={COLORS.error} />
        </View>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.version}>IM v1.0.0</Text>
        <Text style={styles.copyright}>Made with care for your organization</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileGradient: {
    padding: SPACING.lg,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  profileName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  profileAbout: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  version: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  copyright: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
});

export default SettingsScreen;
