import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';

interface ReplyPreviewProps {
  senderName: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  onClear?: () => void;
  isMine?: boolean;
  isInBubble?: boolean;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  senderName,
  content,
  mediaUrl,
  mediaType,
  onClear,
  isMine = false,
  isInBubble = false,
}) => {
  const getMediaIcon = () => {
    switch (mediaType) {
      case 'Image':
        return 'image';
      case 'Video':
        return 'video';
      case 'Audio':
        return 'microphone';
      case 'Document':
        return 'file-document';
      default:
        return null;
    }
  };

  const getMediaLabel = () => {
    switch (mediaType) {
      case 'Image':
        return 'Photo';
      case 'Video':
        return 'Video';
      case 'Audio':
        return 'Voice message';
      case 'Document':
        return 'Document';
      default:
        return content;
    }
  };

  const mediaIcon = getMediaIcon();

  return (
    <View
      style={[
        styles.container,
        isMine && styles.containerMine,
        isInBubble && styles.containerInBubble,
      ]}
    >
      <View
        style={[
          styles.colorBar,
          isMine && styles.colorBarMine,
        ]}
      />

      <View style={styles.content}>
        <Text
          style={[
            styles.senderName,
            isMine && styles.senderNameMine,
          ]}
          numberOfLines={1}
        >
          {senderName}
        </Text>

        <View style={styles.messageContent}>
          {mediaIcon && (
            <Icon
              name={mediaIcon}
              size={14}
              color={COLORS.textSecondary}
              style={styles.mediaIcon}
            />
          )}
          <Text
            style={[
              styles.messageText,
              isMine && styles.messageTextMine,
            ]}
            numberOfLines={1}
          >
            {getMediaLabel()}
          </Text>
        </View>
      </View>

      {mediaUrl && (mediaType === 'Image' || mediaType === 'Video') && (
        <Image source={{ uri: mediaUrl }} style={styles.mediaThumbnail} />
      )}

      {onClear && (
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Icon name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  containerMine: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  containerInBubble: {
    marginHorizontal: -SPACING.sm,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: COLORS.secondary,
  },
  colorBarMine: {
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  senderName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  senderNameMine: {
    color: COLORS.primary,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaIcon: {
    marginRight: SPACING.xs,
  },
  messageText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  messageTextMine: {
    color: COLORS.textSecondary,
  },
  mediaThumbnail: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.sm,
  },
});

export default ReplyPreview;
