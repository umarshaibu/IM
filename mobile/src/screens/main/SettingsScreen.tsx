import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  Linking,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from '../../components/Avatar';
import { authApi } from '../../services/api';
import { disconnectSignalR } from '../../services/signalr';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, FontSize, WallpaperType } from '../../stores/settingsStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme, ThemeMode } from '../../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';
const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';
const HELP_CENTER_URL = 'https://example.com/help';

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
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Settings store
  const {
    settings,
    initialize: initSettings,
    setFontSize,
    setEnterKeySends,
    setWallpaper,
    setMessageNotifications,
    setGroupNotifications,
    setCallNotifications,
    enableTwoStepVerification,
    disableTwoStepVerification,
    verifyTwoStepPin,
  } = useSettingsStore();

  // Two-step verification modal state
  const [showTwoStepModal, setShowTwoStepModal] = useState(false);
  const [twoStepPin, setTwoStepPin] = useState('');
  const [twoStepPinConfirm, setTwoStepPinConfirm] = useState('');
  const [twoStepEmail, setTwoStepEmail] = useState('');
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [exportingChats, setExportingChats] = useState(false);

  // Initialize settings on mount
  useEffect(() => {
    initSettings();
  }, []);

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

  // Handle enabling two-step verification
  const handleEnableTwoStep = () => {
    if (twoStepPin.length < 6) {
      Alert.alert('Error', 'PIN must be at least 6 digits');
      return;
    }
    if (twoStepPin !== twoStepPinConfirm) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setIsEnabling2FA(true);
    setTimeout(() => {
      enableTwoStepVerification(twoStepPin, twoStepEmail || undefined);
      setIsEnabling2FA(false);
      setShowTwoStepModal(false);
      setTwoStepPin('');
      setTwoStepPinConfirm('');
      setTwoStepEmail('');
      Alert.alert('Success', 'Two-step verification has been enabled');
    }, 1000);
  };

  // Security settings handler
  const handleSecurityPress = () => {
    const is2FAEnabled = settings.twoStepVerification.enabled;

    Alert.alert(
      'Security',
      'Configure security settings',
      [
        {
          text: is2FAEnabled ? 'Disable Two-Step Verification' : 'Enable Two-Step Verification',
          onPress: () => {
            if (is2FAEnabled) {
              Alert.alert(
                'Disable Two-Step Verification',
                'Are you sure you want to disable two-step verification? Your account will be less secure.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: () => {
                      disableTwoStepVerification();
                      Alert.alert('Disabled', 'Two-step verification has been disabled');
                    },
                  },
                ]
              );
            } else {
              setShowTwoStepModal(true);
            }
          },
        },
        {
          text: 'End-to-End Encryption',
          onPress: () => {
            Alert.alert(
              'End-to-End Encryption',
              'All your messages are secured with end-to-end encryption. Only you and the person you communicate with can read the messages.',
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Get wallpaper subtitle
  const getWallpaperSubtitle = () => {
    const type = settings.wallpaper.type;
    switch (type) {
      case 'default': return 'Default';
      case 'light': return 'Light Colors';
      case 'dark': return 'Dark Colors';
      case 'solid': return `Solid: ${settings.wallpaper.solidColor || '#FFFFFF'}`;
      default: return 'Default';
    }
  };

  // Chat wallpaper handler
  const handleChatWallpaperPress = () => {
    const currentType = settings.wallpaper.type;

    Alert.alert(
      'Chat Wallpaper',
      `Current: ${getWallpaperSubtitle()}`,
      [
        {
          text: currentType === 'default' ? '✓ Default' : 'Default',
          onPress: () => {
            setWallpaper({ type: 'default' });
            Alert.alert('Wallpaper', 'Default wallpaper set');
          },
        },
        {
          text: currentType === 'light' ? '✓ Light Colors' : 'Light Colors',
          onPress: () => {
            setWallpaper({ type: 'light' });
            Alert.alert('Wallpaper', 'Light colors wallpaper set');
          },
        },
        {
          text: currentType === 'dark' ? '✓ Dark Colors' : 'Dark Colors',
          onPress: () => {
            setWallpaper({ type: 'dark' });
            Alert.alert('Wallpaper', 'Dark colors wallpaper set');
          },
        },
        {
          text: currentType === 'solid' ? '✓ Solid Color' : 'Solid Color',
          onPress: () => {
            // Show color options
            Alert.alert(
              'Choose Color',
              'Select a solid color',
              [
                { text: 'White', onPress: () => { setWallpaper({ type: 'solid', solidColor: '#FFFFFF' }); Alert.alert('Wallpaper', 'White wallpaper set'); } },
                { text: 'Light Gray', onPress: () => { setWallpaper({ type: 'solid', solidColor: '#E5E5E5' }); Alert.alert('Wallpaper', 'Light gray wallpaper set'); } },
                { text: 'Light Blue', onPress: () => { setWallpaper({ type: 'solid', solidColor: '#E3F2FD' }); Alert.alert('Wallpaper', 'Light blue wallpaper set'); } },
                { text: 'Light Green', onPress: () => { setWallpaper({ type: 'solid', solidColor: '#E8F5E9' }); Alert.alert('Wallpaper', 'Light green wallpaper set'); } },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Get font size label
  const getFontSizeLabel = (size: FontSize) => {
    switch (size) {
      case 'small': return 'Small';
      case 'medium': return 'Medium';
      case 'large': return 'Large';
    }
  };

  // Chat settings handler
  const handleChatSettingsPress = () => {
    const currentFontSize = settings.fontSize;
    const enterKeySends = settings.enterKeySends;

    Alert.alert(
      'Chat Settings',
      `Font: ${getFontSizeLabel(currentFontSize)} | Enter sends: ${enterKeySends ? 'On' : 'Off'}`,
      [
        {
          text: 'Font Size',
          onPress: () => {
            Alert.alert(
              'Font Size',
              `Current: ${getFontSizeLabel(currentFontSize)}`,
              [
                {
                  text: currentFontSize === 'small' ? '✓ Small' : 'Small',
                  onPress: () => {
                    setFontSize('small');
                    Alert.alert('Font Size', 'Small font size selected');
                  },
                },
                {
                  text: currentFontSize === 'medium' ? '✓ Medium (Default)' : 'Medium (Default)',
                  onPress: () => {
                    setFontSize('medium');
                    Alert.alert('Font Size', 'Medium font size selected');
                  },
                },
                {
                  text: currentFontSize === 'large' ? '✓ Large' : 'Large',
                  onPress: () => {
                    setFontSize('large');
                    Alert.alert('Font Size', 'Large font size selected');
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          text: `Enter Key Sends: ${enterKeySends ? 'ON ✓' : 'OFF'}`,
          onPress: () => {
            setEnterKeySends(!enterKeySends);
            Alert.alert(
              'Enter Key',
              `Press enter to send messages: ${!enterKeySends ? 'Enabled' : 'Disabled'}`
            );
          },
        },
        {
          text: 'Media Auto-Download',
          onPress: () => Alert.alert('Auto-Download', 'Configure auto-download settings in Storage & Data'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Export chats functionality
  const handleExportChats = async () => {
    setExportingChats(true);

    try {
      // Simulate export process (in production, would gather all chat data)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: user?.id,
        userName: user?.displayName || user?.fullName,
        version: APP_VERSION,
        // In production, include actual conversation data
        conversations: [],
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Share the export
      await Share.share({
        title: 'IM Chat Export',
        message: Platform.OS === 'ios'
          ? `IM Chat Export - ${new Date().toLocaleDateString()}`
          : jsonString,
        url: Platform.OS === 'ios' ? undefined : undefined,
      });

      Alert.alert('Export Complete', 'Your chat history has been exported successfully.');
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export chat history. Please try again.');
    } finally {
      setExportingChats(false);
    }
  };

  // Chat history handler
  const handleChatHistoryPress = () => {
    Alert.alert(
      'Chat History',
      'Manage your chat history',
      [
        {
          text: 'Export Chats',
          onPress: handleExportChats,
        },
        {
          text: 'Clear All Chats',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Clear All Chats',
              'Are you sure you want to clear all chat history? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: async () => {
                    // In production, would clear local database
                    Alert.alert('Cleared', 'All chats have been cleared from this device.');
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Available notification sounds
  const NOTIFICATION_SOUNDS = ['Default', 'Chime', 'Bell', 'Ping', 'Pop', 'None'];
  const RINGTONES = ['Default', 'Classic', 'Modern', 'Gentle', 'Urgent', 'Silent'];

  // Notification settings handlers
  const handleMessageNotificationsPress = () => {
    const msgSettings = settings.messageNotifications;

    Alert.alert(
      'Message Notifications',
      `Sound: ${msgSettings.sound} | Vibration: ${msgSettings.vibration ? 'On' : 'Off'}`,
      [
        {
          text: `Sound: ${msgSettings.sound}`,
          onPress: () => {
            Alert.alert(
              'Notification Sound',
              'Choose a notification sound',
              [
                ...NOTIFICATION_SOUNDS.map(sound => ({
                  text: sound === msgSettings.sound ? `✓ ${sound}` : sound,
                  onPress: () => {
                    setMessageNotifications({ sound: sound.toLowerCase() });
                    Alert.alert('Sound', `${sound} selected`);
                  },
                })),
                { text: 'Cancel', style: 'cancel' as const },
              ]
            );
          },
        },
        {
          text: `Vibration: ${msgSettings.vibration ? 'ON ✓' : 'OFF'}`,
          onPress: () => {
            setMessageNotifications({ vibration: !msgSettings.vibration });
            Alert.alert('Vibration', `Vibration ${!msgSettings.vibration ? 'enabled' : 'disabled'}`);
          },
        },
        {
          text: `Pop-up: ${msgSettings.popup ? 'ON ✓' : 'OFF'}`,
          onPress: () => {
            setMessageNotifications({ popup: !msgSettings.popup });
            Alert.alert('Pop-up', `Pop-up notifications ${!msgSettings.popup ? 'enabled' : 'disabled'}`);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleGroupNotificationsPress = () => {
    const grpSettings = settings.groupNotifications;

    Alert.alert(
      'Group Notifications',
      `Sound: ${grpSettings.sound} | Vibration: ${grpSettings.vibration ? 'On' : 'Off'}`,
      [
        {
          text: `Sound: ${grpSettings.sound}`,
          onPress: () => {
            Alert.alert(
              'Group Sound',
              'Choose a notification sound',
              [
                ...NOTIFICATION_SOUNDS.map(sound => ({
                  text: sound === grpSettings.sound ? `✓ ${sound}` : sound,
                  onPress: () => {
                    setGroupNotifications({ sound: sound.toLowerCase() });
                    Alert.alert('Sound', `${sound} selected`);
                  },
                })),
                { text: 'Cancel', style: 'cancel' as const },
              ]
            );
          },
        },
        {
          text: `Vibration: ${grpSettings.vibration ? 'ON ✓' : 'OFF'}`,
          onPress: () => {
            setGroupNotifications({ vibration: !grpSettings.vibration });
            Alert.alert('Vibration', `Group vibration ${!grpSettings.vibration ? 'enabled' : 'disabled'}`);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCallNotificationsPress = () => {
    const callSettings = settings.callNotifications;

    Alert.alert(
      'Call Notifications',
      `Ringtone: ${callSettings.ringtone} | Vibration: ${callSettings.vibration ? 'On' : 'Off'}`,
      [
        {
          text: `Ringtone: ${callSettings.ringtone}`,
          onPress: () => {
            Alert.alert(
              'Ringtone',
              'Choose a ringtone',
              [
                ...RINGTONES.map(ringtone => ({
                  text: ringtone === callSettings.ringtone ? `✓ ${ringtone}` : ringtone,
                  onPress: () => {
                    setCallNotifications({ ringtone: ringtone.toLowerCase() });
                    Alert.alert('Ringtone', `${ringtone} selected`);
                  },
                })),
                { text: 'Cancel', style: 'cancel' as const },
              ]
            );
          },
        },
        {
          text: `Vibration: ${callSettings.vibration ? 'ON ✓' : 'OFF'}`,
          onPress: () => {
            setCallNotifications({ vibration: !callSettings.vibration });
            Alert.alert('Vibration', `Call vibration ${!callSettings.vibration ? 'enabled' : 'disabled'}`);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Help Center handler
  const handleHelpCenterPress = async () => {
    Alert.alert(
      'Help Center',
      'How can we help you?',
      [
        {
          text: 'FAQ',
          onPress: async () => {
            try {
              await Linking.openURL(HELP_CENTER_URL);
            } catch (error) {
              Alert.alert('Error', 'Could not open Help Center');
            }
          },
        },
        {
          text: 'Contact Support',
          onPress: () => {
            Linking.openURL('mailto:support@example.com?subject=IM App Support');
          },
        },
        {
          text: 'Report a Problem',
          onPress: () => {
            Alert.alert(
              'Report a Problem',
              'Please describe the issue you\'re experiencing. We\'ll look into it.',
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Terms & Privacy handler
  const handleTermsPrivacyPress = () => {
    Alert.alert(
      'Legal',
      'View our legal documents',
      [
        {
          text: 'Terms of Service',
          onPress: async () => {
            try {
              await Linking.openURL(TERMS_URL);
            } catch (error) {
              Alert.alert('Error', 'Could not open Terms of Service');
            }
          },
        },
        {
          text: 'Privacy Policy',
          onPress: async () => {
            try {
              await Linking.openURL(PRIVACY_URL);
            } catch (error) {
              Alert.alert('Error', 'Could not open Privacy Policy');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // App Info handler
  const handleAppInfoPress = () => {
    Alert.alert(
      'IM App',
      `Version: ${APP_VERSION}\nBuild: ${BUILD_NUMBER}\nPlatform: ${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`,
      [
        {
          text: 'Check for Updates',
          onPress: () => {
            Alert.alert('Updates', 'You are running the latest version of IM.');
          },
        },
        {
          text: 'OK',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Avatar
            uri={user?.profilePictureUrl}
            name={user?.displayName || user?.fullName || ''}
            size={72}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.fullName || 'User'}
            </Text>
            <Text style={styles.profileAbout} numberOfLines={1}>
              {user?.about || 'Hey there! I am using IM'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate('QRCode')}
          >
            <Icon name="qrcode-scan" size={22} color={colors.primary} />
          </TouchableOpacity>
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
              icon="shield-check-outline"
              iconColor="#34C759"
              label="Security"
              subtitle="Two-step verification, encryption"
              onPress={handleSecurityPress}
            />
            <View style={styles.divider} />
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
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={isDark ? 'weather-night' : 'white-balance-sunny'}
              iconColor={isDark ? '#FFD60A' : '#FF9F0A'}
              label="Theme"
              subtitle={getThemeSubtitle()}
              onPress={showThemeOptions}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="wallpaper"
              iconColor="#AF52DE"
              label="Chat Wallpaper"
              subtitle="Change chat background"
              onPress={handleChatWallpaperPress}
            />
          </View>
        </View>

        {/* Chats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chats</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="message-text-outline"
              iconColor="#007AFF"
              label="Chat Settings"
              subtitle="Font size, enter key sends"
              onPress={handleChatSettingsPress}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="cloud-upload-outline"
              iconColor="#5856D6"
              label="Chat Backup"
              subtitle="Backup and restore chats"
              onPress={() => navigation.navigate('ChatBackup')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="history"
              iconColor="#FF9500"
              label="Chat History"
              subtitle="Export, clear chats"
              onPress={handleChatHistoryPress}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="bell-outline"
              iconColor="#FF3B30"
              label="Message Notifications"
              subtitle="Sounds, vibration, pop-ups"
              onPress={handleMessageNotificationsPress}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="account-group-outline"
              iconColor="#32ADE6"
              label="Group Notifications"
              subtitle="Sounds, vibration"
              onPress={handleGroupNotificationsPress}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="phone-ring-outline"
              iconColor={colors.callAccept}
              label="Call Notifications"
              subtitle="Ringtone, vibration"
              onPress={handleCallNotificationsPress}
            />
          </View>
        </View>

        {/* Storage & Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage & Data</Text>
          <View style={styles.sectionContent}>
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
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="help-circle-outline"
              iconColor="#007AFF"
              label="Help Center"
              subtitle="FAQ, contact support"
              onPress={handleHelpCenterPress}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="file-document-outline"
              iconColor="#8E8E93"
              label="Terms & Privacy Policy"
              onPress={handleTermsPrivacyPress}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="information-outline"
              iconColor="#8E8E93"
              label="App Info"
              subtitle={`Version ${APP_VERSION}`}
              onPress={handleAppInfoPress}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.logoutIconContainer}>
            <Icon name="logout" size={20} color={colors.error} />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Icon name="lock-outline" size={16} color={colors.textTertiary} />
          <Text style={styles.footerText}>
            Your messages are end-to-end encrypted
          </Text>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.version}>IM v{APP_VERSION}</Text>
          <Text style={styles.copyright}>
            Made with care for your organization
          </Text>
        </View>
      </ScrollView>

      {/* Two-Step Verification Modal */}
      <Modal
        visible={showTwoStepModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTwoStepModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Two-Step Verification
            </Text>
            <Text style={styles.modalSubtitle}>
              Create a 6-digit PIN that will be required when registering your account again.
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="Enter 6-digit PIN"
              placeholderTextColor={colors.textMuted}
              value={twoStepPin}
              onChangeText={setTwoStepPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <TextInput
              style={styles.pinInput}
              placeholder="Confirm PIN"
              placeholderTextColor={colors.textMuted}
              value={twoStepPinConfirm}
              onChangeText={setTwoStepPinConfirm}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <TextInput
              style={styles.pinInput}
              placeholder="Recovery email (optional)"
              placeholderTextColor={colors.textMuted}
              value={twoStepEmail}
              onChangeText={setTwoStepEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowTwoStepModal(false);
                  setTwoStepPin('');
                  setTwoStepPinConfirm('');
                  setTwoStepEmail('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleEnableTwoStep}
                disabled={isEnabling2FA}
              >
                {isEnabling2FA ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Enable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Loading Overlay */}
      {exportingChats && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Exporting chats...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.md,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  profileName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  profileAbout: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
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
    color: colors.textSecondary,
  },
  sectionContent: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.divider,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surface,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    backgroundColor: colors.error + '15',
  },
  logoutText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.error,
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
    color: colors.textTertiary,
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  version: {
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    color: colors.textTertiary,
  },
  copyright: {
    fontSize: FONTS.sizes.xs,
    color: colors.textTertiary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.textSecondary,
  },
  pinInput: {
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.md,
    textAlign: 'center',
    letterSpacing: 4,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    borderColor: colors.divider,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalButtonCancelText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonConfirmText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textInverse,
  },
  // Loading overlay styles
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: colors.text,
  },
});

export default SettingsScreen;
