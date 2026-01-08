import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { AppConfig } from '../../config';

// Helper to convert relative media URLs to full URLs
const getFullMediaUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = AppConfig.apiUrl;
  return `${baseUrl}${url}`;
};

// Get file extension from filename or URL
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

// Get icon based on file type
const getDocumentIcon = (extension: string): string => {
  switch (extension) {
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
    case 'txt':
      return 'file-document-outline';
    case 'zip':
    case 'rar':
    case '7z':
      return 'folder-zip';
    case 'mp3':
    case 'wav':
    case 'aac':
      return 'file-music';
    default:
      return 'file-document';
  }
};

// Get icon color based on file type
const getDocumentIconColor = (extension: string): string => {
  switch (extension) {
    case 'pdf':
      return '#E53935';
    case 'doc':
    case 'docx':
      return '#1976D2';
    case 'xls':
    case 'xlsx':
      return '#388E3C';
    case 'ppt':
    case 'pptx':
      return '#E64A19';
    case 'txt':
      return '#757575';
    default:
      return '#607D8B';
  }
};

// Check if file type can be previewed
const canPreview = (extension: string): boolean => {
  return ['pdf', 'txt'].includes(extension);
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type DocumentViewerRouteProp = RouteProp<RootStackParamList, 'DocumentViewer'>;

const DocumentViewerScreen: React.FC = () => {
  const route = useRoute<DocumentViewerRouteProp>();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { mediaUrl, fileName, fileSize, senderName, timestamp } = route.params;

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fullUrl = getFullMediaUrl(mediaUrl);
  const extension = getFileExtension(fileName);
  const iconName = getDocumentIcon(extension);
  const iconColor = getDocumentIconColor(extension);
  const previewable = canPreview(extension);

  // Check if file already exists locally
  useEffect(() => {
    const checkLocalFile = async () => {
      const downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      const exists = await RNFS.exists(downloadPath);
      if (exists) {
        setIsDownloaded(true);
        setLocalPath(downloadPath);
      }
    };
    checkLocalFile();
  }, [fileName]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      const downloadResult = RNFS.downloadFile({
        fromUrl: fullUrl,
        toFile: downloadPath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          setDownloadProgress(progress);
        },
        progressDivider: 1,
      });

      const result = await downloadResult.promise;

      if (result.statusCode === 200) {
        setIsDownloaded(true);
        setLocalPath(downloadPath);
        Alert.alert('Success', 'Document downloaded successfully');
      } else {
        Alert.alert('Error', 'Failed to download document');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download document');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpen = async () => {
    if (!localPath) {
      Alert.alert('Not Downloaded', 'Please download the document first');
      return;
    }

    if (Platform.OS === 'ios') {
      // Use QuickLook on iOS
      const Linking = require('react-native').Linking;
      Linking.openURL(`file://${localPath}`);
    } else {
      // Use intent on Android
      try {
        const FileViewer = require('react-native-file-viewer').default;
        await FileViewer.open(localPath);
      } catch (error) {
        console.error('Error opening file:', error);
        Alert.alert('Error', 'No app found to open this file type');
      }
    }
  };

  const handleShare = async () => {
    try {
      if (localPath && isDownloaded) {
        await Share.share({
          url: Platform.OS === 'ios' ? `file://${localPath}` : localPath,
        });
      } else {
        await Share.share({
          url: fullUrl,
          message: Platform.OS === 'android' ? fullUrl : undefined,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handlePreview = () => {
    if (previewable) {
      setShowPreview(true);
    } else {
      Alert.alert('Preview Not Available', 'This file type cannot be previewed. Please download to view.');
    }
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    if (extension === 'pdf') {
      return (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closePreviewButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>{fileName}</Text>
          </View>
          <WebView
            source={{ uri: fullUrl }}
            style={styles.webView}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        </View>
      );
    }

    return null;
  };

  if (showPreview) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {renderPreview()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Document</Text>
          {senderName && <Text style={styles.headerSubtitle}>From {senderName}</Text>}
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Icon name="share-variant" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Document Preview Card */}
        <View style={styles.documentCard}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Icon name={iconName} size={64} color={iconColor} />
          </View>

          <Text style={styles.fileName} numberOfLines={2}>
            {fileName}
          </Text>

          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>{extension.toUpperCase()}</Text>
            {fileSize && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{formatFileSize(fileSize)}</Text>
              </>
            )}
            {timestamp && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{timestamp}</Text>
              </>
            )}
          </View>

          {/* Download Progress */}
          {isDownloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progress, { width: `${downloadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
            </View>
          )}

          {/* Downloaded Badge */}
          {isDownloaded && !isDownloading && (
            <View style={styles.downloadedBadge}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.downloadedText, { color: colors.success }]}>Downloaded</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {previewable && (
            <TouchableOpacity
              style={[styles.actionButton, styles.previewButton]}
              onPress={handlePreview}
            >
              <Icon name="eye" size={24} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Preview</Text>
            </TouchableOpacity>
          )}

          {!isDownloaded ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Icon name="download" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.openButton, { backgroundColor: colors.primary }]}
              onPress={handleOpen}
            >
              <Icon name="open-in-new" size={24} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Open</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About this file</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>File name</Text>
            <Text style={styles.infoValue}>{fileName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>File type</Text>
            <Text style={styles.infoValue}>{extension.toUpperCase() || 'Unknown'}</Text>
          </View>
          {fileSize && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size</Text>
              <Text style={styles.infoValue}>{formatFileSize(fileSize)}</Text>
            </View>
          )}
          {senderName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sent by</Text>
              <Text style={styles.infoValue}>{senderName}</Text>
            </View>
          )}
          {timestamp && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{timestamp}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
      paddingBottom: SPACING.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    backButton: {
      padding: SPACING.sm,
    },
    headerInfo: {
      flex: 1,
      marginLeft: SPACING.sm,
    },
    headerTitle: {
      fontSize: FONTS.sizes.lg,
      fontWeight: '600',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: FONTS.sizes.sm,
      color: colors.textSecondary,
    },
    headerButton: {
      padding: SPACING.sm,
    },
    content: {
      padding: SPACING.lg,
    },
    documentCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      alignItems: 'center',
      marginBottom: SPACING.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    fileName: {
      fontSize: FONTS.sizes.lg,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: SPACING.sm,
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontSize: FONTS.sizes.sm,
      color: colors.textSecondary,
    },
    metaDot: {
      marginHorizontal: SPACING.xs,
      color: colors.textSecondary,
    },
    progressContainer: {
      width: '100%',
      marginTop: SPACING.lg,
    },
    progressBar: {
      width: '100%',
      height: 4,
      backgroundColor: colors.divider,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progress: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    progressText: {
      fontSize: FONTS.sizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
    downloadedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.md,
      gap: SPACING.xs,
    },
    downloadedText: {
      fontSize: FONTS.sizes.sm,
      fontWeight: '500',
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      gap: SPACING.sm,
    },
    previewButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    downloadButton: {},
    openButton: {},
    actionButtonText: {
      fontSize: FONTS.sizes.md,
      fontWeight: '600',
    },
    infoSection: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
    },
    infoTitle: {
      fontSize: FONTS.sizes.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: SPACING.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    infoLabel: {
      fontSize: FONTS.sizes.sm,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: FONTS.sizes.sm,
      color: colors.text,
      fontWeight: '500',
      maxWidth: '60%',
      textAlign: 'right',
    },
    previewContainer: {
      flex: 1,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
      paddingBottom: SPACING.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    closePreviewButton: {
      padding: SPACING.sm,
    },
    previewTitle: {
      flex: 1,
      fontSize: FONTS.sizes.md,
      fontWeight: '600',
      color: colors.text,
      marginLeft: SPACING.sm,
    },
    webView: {
      flex: 1,
    },
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });

export default DocumentViewerScreen;
