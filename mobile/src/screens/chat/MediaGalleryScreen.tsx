import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { filesApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { FONTS, SPACING } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type MediaGalleryRouteProp = RouteProp<RootStackParamList, 'MediaGallery'>;
type MediaGalleryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - SPACING.sm * 4) / 3;

interface MediaFile {
  id: string;
  url: string;
  type: 'Image' | 'Video' | 'Audio' | 'Document';
  fileName: string;
  fileSize: number;
  createdAt: string;
  senderName: string;
}

const MediaGalleryScreen: React.FC = () => {
  const route = useRoute<MediaGalleryRouteProp>();
  const navigation = useNavigation<MediaGalleryNavigationProp>();
  const { conversationId } = route.params;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');

  const { data: mediaFiles, isLoading } = useQuery({
    queryKey: ['conversationMedia', conversationId],
    queryFn: async () => {
      const response = await filesApi.getConversationMedia(conversationId);
      return response.data as MediaFile[];
    },
  });

  const filteredMedia = mediaFiles?.filter((file) => {
    switch (activeTab) {
      case 'media':
        return file.type === 'Image' || file.type === 'Video';
      case 'docs':
        return file.type === 'Document' || file.type === 'Audio';
      case 'links':
        return false; // Would filter links from messages
      default:
        return true;
    }
  });

  const groupedMedia = filteredMedia?.reduce((groups, file) => {
    const month = format(new Date(file.createdAt), 'MMMM yyyy');
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(file);
    return groups;
  }, {} as Record<string, MediaFile[]>);

  const handleMediaPress = (file: MediaFile) => {
    navigation.navigate('MediaViewer', {
      mediaUrl: file.url,
      mediaType: file.type,
      senderName: file.senderName,
      timestamp: format(new Date(file.createdAt), 'MMM d, yyyy HH:mm'),
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'file-pdf-box';
      case 'doc':
      case 'docx':
        return 'file-word-box';
      case 'xls':
      case 'xlsx':
        return 'file-excel-box';
      case 'ppt':
      case 'pptx':
        return 'file-powerpoint-box';
      case 'mp3':
      case 'wav':
      case 'aac':
        return 'file-music';
      default:
        return 'file-document';
    }
  };

  const renderMediaItem = ({ item }: { item: MediaFile }) => {
    if (item.type === 'Image') {
      return (
        <TouchableOpacity
          style={styles.mediaItem}
          onPress={() => handleMediaPress(item)}
        >
          <Image source={{ uri: item.url }} style={styles.mediaImage} />
        </TouchableOpacity>
      );
    }

    if (item.type === 'Video') {
      return (
        <TouchableOpacity
          style={styles.mediaItem}
          onPress={() => handleMediaPress(item)}
        >
          <Image source={{ uri: item.url }} style={styles.mediaImage} />
          <View style={styles.videoOverlay}>
            <Icon name="play-circle" size={32} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.documentItem}
        onPress={() => handleMediaPress(item)}
      >
        <Icon
          name={getDocumentIcon(item.fileName)}
          size={40}
          color={colors.secondary}
        />
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.documentMeta}>
            {formatFileSize(item.fileSize)} • {format(new Date(item.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (month: string, files: MediaFile[]) => (
    <View key={month} style={styles.section}>
      <Text style={styles.sectionTitle}>{month}</Text>
      {activeTab === 'media' ? (
        <View style={styles.mediaGrid}>
          {files.map((file) => (
            <View key={file.id}>{renderMediaItem({ item: file })}</View>
          ))}
        </View>
      ) : (
        files.map((file) => (
          <View key={file.id}>{renderMediaItem({ item: file })}</View>
        ))
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <View style={styles.tabs}>
        {(['media', 'docs', 'links'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={
                tab === 'media'
                  ? 'image-multiple'
                  : tab === 'docs'
                  ? 'file-document'
                  : 'link-variant'
              }
              size={24}
              color={activeTab === tab ? colors.secondary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!groupedMedia || Object.keys(groupedMedia).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={
              activeTab === 'media'
                ? 'image-off'
                : activeTab === 'docs'
                ? 'file-document-outline'
                : 'link-off'
            }
            size={60}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No {activeTab === 'media' ? 'photos or videos' : activeTab} yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedMedia)}
          renderItem={({ item: [month, files] }) => renderSection(month, files)}
          keyExtractor={([month]) => month}
        />
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.secondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    padding: SPACING.md,
    backgroundColor: colors.background,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xs,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING.xs,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  documentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  documentName: {
    fontSize: FONTS.sizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  documentMeta: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: colors.textSecondary,
    marginTop: SPACING.md,
  },
});

export default MediaGalleryScreen;
