import { Platform, Dimensions } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { filesApi } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MediaFile {
  uri: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Get file type from MIME type or extension
 */
export const getFileType = (mimeType: string, fileName: string): 'image' | 'video' | 'audio' | 'document' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

/**
 * Get appropriate icon for file type
 */
export const getFileIcon = (fileName: string, mimeType?: string): string => {
  const ext = getFileExtension(fileName);

  // Check by extension first
  const iconMap: Record<string, string> = {
    pdf: 'file-pdf-box',
    doc: 'file-word-box',
    docx: 'file-word-box',
    xls: 'file-excel-box',
    xlsx: 'file-excel-box',
    ppt: 'file-powerpoint-box',
    pptx: 'file-powerpoint-box',
    txt: 'file-document',
    zip: 'folder-zip',
    rar: 'folder-zip',
    mp3: 'file-music',
    wav: 'file-music',
    aac: 'file-music',
    mp4: 'file-video',
    mov: 'file-video',
    avi: 'file-video',
    jpg: 'file-image',
    jpeg: 'file-image',
    png: 'file-image',
    gif: 'file-image',
    webp: 'file-image',
  };

  return iconMap[ext] || 'file-document';
};

/**
 * Calculate image dimensions to fit screen width
 */
export const calculateImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = SCREEN_WIDTH * 0.7
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  return {
    width: maxWidth,
    height: maxWidth / aspectRatio,
  };
};

/**
 * Pick image from gallery
 */
export const pickImage = async (): Promise<MediaFile | null> => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri || '',
      type: 'image',
      fileName: asset.fileName || 'image.jpg',
      fileSize: asset.fileSize || 0,
      mimeType: asset.type || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Pick video from gallery
 */
export const pickVideo = async (): Promise<MediaFile | null> => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'video',
      videoQuality: 'high',
    });

    if (result.didCancel || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri || '',
      type: 'video',
      fileName: asset.fileName || 'video.mp4',
      fileSize: asset.fileSize || 0,
      mimeType: asset.type || 'video/mp4',
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    };
  } catch (error) {
    console.error('Error picking video:', error);
    return null;
  }
};

/**
 * Take photo with camera
 */
export const takePhoto = async (): Promise<MediaFile | null> => {
  try {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri || '',
      type: 'image',
      fileName: asset.fileName || 'photo.jpg',
      fileSize: asset.fileSize || 0,
      mimeType: asset.type || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

/**
 * Record video with camera
 */
export const recordVideo = async (): Promise<MediaFile | null> => {
  try {
    const result = await launchCamera({
      mediaType: 'video',
      videoQuality: 'high',
      durationLimit: 60,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri || '',
      type: 'video',
      fileName: asset.fileName || 'video.mp4',
      fileSize: asset.fileSize || 0,
      mimeType: asset.type || 'video/mp4',
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    };
  } catch (error) {
    console.error('Error recording video:', error);
    return null;
  }
};

/**
 * Pick document
 */
export const pickDocument = async (): Promise<MediaFile | null> => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });

    if (!result[0]) {
      return null;
    }

    const doc = result[0];
    return {
      uri: doc.uri,
      type: 'document',
      fileName: doc.name || 'document',
      fileSize: doc.size || 0,
      mimeType: doc.type || 'application/octet-stream',
    };
  } catch (error) {
    if (!DocumentPicker.isCancel(error)) {
      console.error('Error picking document:', error);
    }
    return null;
  }
};

/**
 * Upload media file to server
 */
export const uploadMedia = async (media: MediaFile): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri: media.uri,
    type: media.mimeType,
    name: media.fileName,
  } as any);

  const response = await filesApi.upload(formData);
  return response.data.url;
};

/**
 * Generate thumbnail URI for video
 */
export const generateVideoThumbnail = async (videoUri: string): Promise<string | null> => {
  // This would require a native module like react-native-video-thumbnail
  // For now, return null and show a placeholder
  return null;
};

/**
 * Check if file size is within limit
 */
export const isFileSizeValid = (fileSize: number, maxSizeMB: number = 100): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxBytes;
};

/**
 * Compress image before upload
 */
export const compressImage = async (uri: string, quality: number = 0.8): Promise<string> => {
  // This would require a native module like react-native-image-resizer
  // For now, return the original URI
  return uri;
};

/**
 * Convert relative URL to absolute URL
 * This is needed because the backend returns relative URLs like /api/files/...
 * but React Native Image component needs absolute URLs
 *
 * Note: We use lazy import of AppConfig to avoid circular dependency issues
 * during module loading
 */
export const getAbsoluteUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;

  // If it's already an absolute URL, use it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Lazy import to avoid circular dependency/module loading issues
  const { AppConfig } = require('../config');

  // If it's a relative URL starting with /, prepend the API base URL
  if (url.startsWith('/')) {
    return `${AppConfig.apiUrl}${url}`;
  }

  // Otherwise, assume it needs the full path
  return `${AppConfig.apiUrl}/${url}`;
};
