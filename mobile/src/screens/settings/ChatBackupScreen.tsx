import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { format } from 'date-fns';

const BACKUP_KEY = '@chat_backup_info';
const BACKUP_SETTINGS_KEY = '@backup_settings';

interface BackupInfo {
  lastBackupDate: string;
  backupSize: number;
  messageCount: number;
  mediaIncluded: boolean;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  includeMedia: boolean;
  includeVideos: boolean;
}

const ChatBackupScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackup: false,
    backupFrequency: 'weekly',
    includeMedia: true,
    includeVideos: false,
  });

  useEffect(() => {
    loadBackupInfo();
    loadSettings();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const storedInfo = await AsyncStorage.getItem(BACKUP_KEY);
      if (storedInfo) {
        setBackupInfo(JSON.parse(storedInfo));
      }
    } catch (error) {
      console.error('Error loading backup info:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(BACKUP_SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: BackupSettings) => {
    try {
      await AsyncStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleBackup = async () => {
    Alert.alert(
      'Create Backup',
      `This will create a backup of your messages${settings.includeMedia ? ' and media files' : ''}. This may take a few minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            setIsBackingUp(true);
            setBackupProgress(0);

            try {
              // Simulate backup progress
              for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 300));
                setBackupProgress(i);
              }

              // Create backup directory
              const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
              const dirExists = await RNFS.exists(backupDir);
              if (!dirExists) {
                await RNFS.mkdir(backupDir);
              }

              // Create a mock backup file (in real implementation, this would serialize chat data)
              const backupFileName = `im_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
              const backupPath = `${backupDir}/${backupFileName}`;

              const mockBackupData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                messages: [],
                conversations: [],
                settings: settings,
              };

              await RNFS.writeFile(backupPath, JSON.stringify(mockBackupData), 'utf8');

              // Get file stats
              const stats = await RNFS.stat(backupPath);

              const newBackupInfo: BackupInfo = {
                lastBackupDate: new Date().toISOString(),
                backupSize: Number(stats.size) || 1024,
                messageCount: 0,
                mediaIncluded: settings.includeMedia,
              };

              await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(newBackupInfo));
              setBackupInfo(newBackupInfo);

              Alert.alert('Success', 'Backup created successfully!');
            } catch (error) {
              console.error('Backup error:', error);
              Alert.alert('Error', 'Failed to create backup. Please try again.');
            } finally {
              setIsBackingUp(false);
              setBackupProgress(0);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Backup',
      'This will replace your current messages with the backed up data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
              const files = await RNFS.readDir(backupDir);
              const backupFiles = files.filter(f => f.name.endsWith('.json'));

              if (backupFiles.length === 0) {
                Alert.alert('No Backup Found', 'There is no backup file to restore.');
                return;
              }

              // Get the most recent backup
              const mostRecent = backupFiles.sort((a, b) =>
                b.mtime ? (a.mtime ? b.mtime.getTime() - a.mtime.getTime() : 1) : -1
              )[0];

              // Read and parse backup
              const backupContent = await RNFS.readFile(mostRecent.path, 'utf8');
              const backupData = JSON.parse(backupContent);

              // In real implementation, restore messages and conversations here
              console.log('Restoring backup from:', backupData.createdAt);

              Alert.alert('Success', 'Backup restored successfully!');
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore backup.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExportChat = async () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        app: 'IM',
        version: '1.0',
        conversations: [],
      };

      const exportPath = `${RNFS.DocumentDirectoryPath}/im_chat_export.txt`;
      await RNFS.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');

      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${exportPath}`,
          title: 'IM Chat Export',
        });
      } else {
        await Share.share({
          message: 'Chat export created. Check your downloads folder.',
          title: 'IM Chat Export',
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export chats.');
    }
  };

  const handleDeleteBackups = () => {
    Alert.alert(
      'Delete All Backups',
      'This will delete all local backup files. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const backupDir = `${RNFS.DocumentDirectoryPath}/backups`;
              if (await RNFS.exists(backupDir)) {
                await RNFS.unlink(backupDir);
              }
              await AsyncStorage.removeItem(BACKUP_KEY);
              setBackupInfo(null);
              Alert.alert('Success', 'All backups deleted.');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete backups.');
            }
          },
        },
      ]
    );
  };

  const toggleAutoBackup = () => {
    const newSettings = { ...settings, autoBackup: !settings.autoBackup };
    saveSettings(newSettings);
  };

  const toggleIncludeMedia = () => {
    const newSettings = { ...settings, includeMedia: !settings.includeMedia };
    saveSettings(newSettings);
  };

  const toggleIncludeVideos = () => {
    const newSettings = { ...settings, includeVideos: !settings.includeVideos };
    saveSettings(newSettings);
  };

  const showFrequencyOptions = () => {
    Alert.alert(
      'Backup Frequency',
      'How often should automatic backups run?',
      [
        { text: 'Daily', onPress: () => saveSettings({ ...settings, backupFrequency: 'daily' }) },
        { text: 'Weekly', onPress: () => saveSettings({ ...settings, backupFrequency: 'weekly' }) },
        { text: 'Monthly', onPress: () => saveSettings({ ...settings, backupFrequency: 'monthly' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const SettingRow = ({
    icon,
    iconColor,
    label,
    subtitle,
    onPress,
    rightComponent,
  }: {
    icon: string;
    iconColor?: string;
    label: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
        <Icon name={icon} size={20} color={iconColor || colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {rightComponent || (onPress && (
        <Icon name="chevron-right" size={22} color={colors.textTertiary} />
      ))}
    </TouchableOpacity>
  );

  const SwitchRow = ({
    icon,
    iconColor,
    label,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: string;
    iconColor?: string;
    label: string;
    subtitle?: string;
    value: boolean;
    onValueChange: () => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
        <Icon name={icon} size={20} color={iconColor || colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.switch,
          { backgroundColor: value ? colors.primary : colors.switchTrack },
        ]}
        onPress={onValueChange}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.switchThumb,
            {
              backgroundColor: colors.switchThumb,
              transform: [{ translateX: value ? 20 : 0 }],
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Chat Backup</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isBackingUp && (
        <View style={[styles.progressContainer, { backgroundColor: colors.primary + '15' }]}>
          <View style={styles.progressRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              Creating backup... {backupProgress}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${backupProgress}%` },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Last Backup Info */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.backupInfoContainer}>
            <View style={[styles.backupIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="cloud-check" size={32} color={colors.primary} />
            </View>
            <View style={styles.backupDetails}>
              {backupInfo ? (
                <>
                  <Text style={[styles.backupTitle, { color: colors.text }]}>Last Backup</Text>
                  <Text style={[styles.backupDate, { color: colors.textSecondary }]}>
                    {format(new Date(backupInfo.lastBackupDate), 'MMM d, yyyy h:mm a')}
                  </Text>
                  <Text style={[styles.backupSize, { color: colors.textTertiary }]}>
                    {formatBytes(backupInfo.backupSize)} • {backupInfo.messageCount} messages
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.backupTitle, { color: colors.text }]}>No Backup Found</Text>
                  <Text style={[styles.backupDate, { color: colors.textSecondary }]}>
                    Create your first backup to protect your messages
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.backupButton, { backgroundColor: colors.primary }]}
            onPress={handleBackup}
            disabled={isBackingUp || isLoading}
          >
            <Icon name="cloud-upload" size={20} color="#FFFFFF" />
            <Text style={styles.backupButtonText}>
              {backupInfo ? 'Update Backup' : 'Create Backup'}
            </Text>
          </TouchableOpacity>

          {backupInfo && (
            <TouchableOpacity
              style={[styles.restoreButton, { borderColor: colors.primary }]}
              onPress={handleRestore}
              disabled={isBackingUp || isLoading}
            >
              <Icon name="cloud-download" size={20} color={colors.primary} />
              <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                Restore from Backup
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Auto Backup Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Automatic Backup
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SwitchRow
            icon="sync"
            iconColor="#007AFF"
            label="Auto Backup"
            subtitle="Automatically backup chats"
            value={settings.autoBackup}
            onValueChange={toggleAutoBackup}
          />

          {settings.autoBackup && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <SettingRow
                icon="clock-outline"
                iconColor="#FF9500"
                label="Backup Frequency"
                subtitle={settings.backupFrequency.charAt(0).toUpperCase() + settings.backupFrequency.slice(1)}
                onPress={showFrequencyOptions}
              />
            </>
          )}
        </View>

        {/* Include Options */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Include in Backup
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SwitchRow
            icon="image-multiple"
            iconColor="#34C759"
            label="Include Media"
            subtitle="Photos and audio files"
            value={settings.includeMedia}
            onValueChange={toggleIncludeMedia}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SwitchRow
            icon="video"
            iconColor="#5856D6"
            label="Include Videos"
            subtitle="May significantly increase backup size"
            value={settings.includeVideos}
            onValueChange={toggleIncludeVideos}
          />
        </View>

        {/* Export & Delete */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Export & Manage
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="export"
            iconColor="#007AFF"
            label="Export Chat History"
            subtitle="Export chats to a text file"
            onPress={handleExportChat}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingRow
            icon="delete-outline"
            iconColor={colors.error}
            label="Delete All Backups"
            subtitle="Remove all local backup files"
            onPress={handleDeleteBackups}
          />
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Icon name="information-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            Backups are stored locally on your device. For additional security, consider
            copying backups to external storage.
          </Text>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.overlay }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginLeft: SPACING.md,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  section: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.lg,
  },
  backupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  backupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  backupTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  backupDate: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  backupSize: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.md,
    marginTop: 0,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  backupButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.md,
    marginTop: 0,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  restoreButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  settingIcon: {
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
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.sm,
    lineHeight: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatBackupScreen;
