import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

interface StorageInfo {
  totalSize: number;
  images: number;
  videos: number;
  audio: number;
  documents: number;
  cache: number;
}

const StorageManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    totalSize: 0,
    images: 0,
    videos: 0,
    audio: 0,
    documents: 0,
    cache: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState<string | null>(null);

  useEffect(() => {
    calculateStorageUsage();
  }, []);

  const calculateStorageUsage = async () => {
    setIsLoading(true);
    try {
      // Get cache directory size
      const cacheDir = RNFS.CachesDirectoryPath;
      const cacheSize = await getDirectorySize(cacheDir);

      // Get document directory size
      const docDir = RNFS.DocumentDirectoryPath;
      const docSize = await getDirectorySize(docDir);

      // Categorize files
      let images = 0;
      let videos = 0;
      let audio = 0;
      let documents = 0;

      const categorizeFiles = async (dir: string) => {
        try {
          const files = await RNFS.readDir(dir);
          for (const file of files) {
            if (file.isDirectory()) {
              await categorizeFiles(file.path);
            } else {
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              const size = file.size || 0;

              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
                images += size;
              } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
                videos += size;
              } else if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext)) {
                audio += size;
              } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) {
                documents += size;
              }
            }
          }
        } catch (e) {
          // Directory might not exist or be accessible
        }
      };

      await categorizeFiles(docDir);

      setStorageInfo({
        totalSize: cacheSize + docSize,
        images,
        videos,
        audio,
        documents,
        cache: cacheSize,
      });
    } catch (error) {
      console.error('Error calculating storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDirectorySize = async (path: string): Promise<number> => {
    let size = 0;
    try {
      const files = await RNFS.readDir(path);
      for (const file of files) {
        if (file.isDirectory()) {
          size += await getDirectorySize(file.path);
        } else {
          size += file.size || 0;
        }
      }
    } catch (e) {
      // Directory might not exist
    }
    return size;
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Downloaded media will need to be re-downloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing('cache');
            try {
              const cacheDir = RNFS.CachesDirectoryPath;
              const files = await RNFS.readDir(cacheDir);
              for (const file of files) {
                await RNFS.unlink(file.path);
              }
              await calculateStorageUsage();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setIsClearing(null);
            }
          },
        },
      ]
    );
  };

  const clearAllMedia = async () => {
    Alert.alert(
      'Clear All Media',
      'This will delete all downloaded images, videos, audio, and documents. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsClearing('all');
            try {
              const docDir = RNFS.DocumentDirectoryPath;
              const mediaDirs = ['images', 'videos', 'audio', 'documents'];

              for (const dir of mediaDirs) {
                const path = `${docDir}/${dir}`;
                try {
                  await RNFS.unlink(path);
                } catch (e) {
                  // Directory might not exist
                }
              }

              await calculateStorageUsage();
              Alert.alert('Success', 'All media cleared successfully');
            } catch (error) {
              console.error('Error clearing media:', error);
              Alert.alert('Error', 'Failed to clear media');
            } finally {
              setIsClearing(null);
            }
          },
        },
      ]
    );
  };

  const clearAsyncStorage = async () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all app preferences and cached data. You will remain logged in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing('data');
            try {
              // Get keys to preserve
              const keysToKeep = ['@auth_tokens', '@user_data'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter((key) => !keysToKeep.includes(key));
              await AsyncStorage.multiRemove(keysToRemove);

              Alert.alert('Success', 'App data cleared successfully');
            } catch (error) {
              console.error('Error clearing app data:', error);
              Alert.alert('Error', 'Failed to clear app data');
            } finally {
              setIsClearing(null);
            }
          },
        },
      ]
    );
  };

  const renderStorageBar = () => {
    const total = storageInfo.totalSize || 1;
    const segments = [
      { color: '#4CAF50', size: storageInfo.images, label: 'Images' },
      { color: '#2196F3', size: storageInfo.videos, label: 'Videos' },
      { color: '#FF9800', size: storageInfo.audio, label: 'Audio' },
      { color: '#9C27B0', size: storageInfo.documents, label: 'Documents' },
      { color: '#607D8B', size: storageInfo.cache, label: 'Cache' },
    ];

    return (
      <View style={styles.storageBarContainer}>
        <View style={[styles.storageBar, { backgroundColor: colors.divider }]}>
          {segments.map((segment, index) => {
            const width = (segment.size / total) * 100;
            if (width < 1) return null;
            return (
              <View
                key={index}
                style={[
                  styles.storageBarSegment,
                  { backgroundColor: segment.color, width: `${width}%` },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.storageLegend}>
          {segments.map((segment, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {segment.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStorageItem = (
    icon: string,
    title: string,
    size: number,
    color: string
  ) => (
    <View style={[styles.storageItem, { backgroundColor: colors.card }]}>
      <View style={[styles.storageItemIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.storageItemInfo}>
        <Text style={[styles.storageItemTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.storageItemSize, { color: colors.textSecondary }]}>
          {formatSize(size)}
        </Text>
      </View>
    </View>
  );

  const renderActionButton = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    isLoading: boolean,
    color: string = colors.text
  ) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.actionButtonContent}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.actionButtonText}>
          <Text style={[styles.actionButtonTitle, { color }]}>{title}</Text>
          <Text style={[styles.actionButtonSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="chevron-right" size={24} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>
            Storage & Data
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Storage */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.totalStorage}>
            <Icon name="database" size={48} color={colors.primary} />
            <View style={styles.totalStorageInfo}>
              <Text style={[styles.totalStorageTitle, { color: colors.text }]}>
                Total Storage Used
              </Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.totalStorageSize, { color: colors.primary }]}>
                  {formatSize(storageInfo.totalSize)}
                </Text>
              )}
            </View>
          </View>
          {!isLoading && renderStorageBar()}
        </View>

        {/* Storage Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          STORAGE BREAKDOWN
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {renderStorageItem('image', 'Images', storageInfo.images, '#4CAF50')}
          <View style={[styles.itemDivider, { backgroundColor: colors.divider }]} />
          {renderStorageItem('video', 'Videos', storageInfo.videos, '#2196F3')}
          <View style={[styles.itemDivider, { backgroundColor: colors.divider }]} />
          {renderStorageItem('music', 'Audio', storageInfo.audio, '#FF9800')}
          <View style={[styles.itemDivider, { backgroundColor: colors.divider }]} />
          {renderStorageItem('file-document', 'Documents', storageInfo.documents, '#9C27B0')}
          <View style={[styles.itemDivider, { backgroundColor: colors.divider }]} />
          {renderStorageItem('cached', 'Cache', storageInfo.cache, '#607D8B')}
        </View>

        {/* Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          MANAGE STORAGE
        </Text>
        <View style={styles.actionsSection}>
          {renderActionButton(
            'broom',
            'Clear Cache',
            'Free up space by clearing cached data',
            clearCache,
            isClearing === 'cache',
            colors.text
          )}
          {renderActionButton(
            'trash-can-outline',
            'Clear All Media',
            'Delete all downloaded media files',
            clearAllMedia,
            isClearing === 'all',
            colors.error
          )}
          {renderActionButton(
            'database-remove',
            'Clear App Data',
            'Reset app preferences and cached data',
            clearAsyncStorage,
            isClearing === 'data',
            colors.warning
          )}
        </View>

        {/* Network Usage Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          NETWORK USAGE
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.settingItem}>
            <Icon name="download" size={24} color={colors.text} />
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                Media auto-download
              </Text>
              <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>
                Wi-Fi: All media, Mobile: Photos only
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.itemDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={styles.settingItem}>
            <Icon name="quality-high" size={24} color={colors.text} />
            <View style={styles.settingItemText}>
              <Text style={[styles.settingItemTitle, { color: colors.text }]}>
                Media upload quality
              </Text>
              <Text style={[styles.settingItemSubtitle, { color: colors.textSecondary }]}>
                Standard quality
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  totalStorage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  totalStorageInfo: {
    marginLeft: SPACING.lg,
  },
  totalStorageTitle: {
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  totalStorageSize: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  storageBarContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  storageBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  storageBarSegment: {
    height: '100%',
  },
  storageLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  storageItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageItemInfo: {
    marginLeft: SPACING.md,
  },
  storageItemTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  storageItemSize: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    marginLeft: 72,
  },
  actionsSection: {
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  actionButtonSubtitle: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  settingItemText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  settingItemTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  settingItemSubtitle: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
});

export default StorageManagementScreen;
