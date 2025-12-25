import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { Message } from '../types';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import AudioPlayer from './AudioPlayer';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSenderName?: boolean;
  onLongPress?: () => void;
  onMediaPress?: () => void;
  onReplyPress?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  showSenderName = false,
  onLongPress,
  onMediaPress,
  onReplyPress,
}) => {
  const { colors, isDark } = useTheme();

  if (message.isDeleted) {
    return (
      <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
        <View style={[styles.bubble, styles.deletedBubble, { backgroundColor: colors.divider }]}>
          <Icon name="cancel" size={16} color={colors.textMuted} />
          <Text style={[styles.deletedText, { color: colors.textMuted }]}>
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  const getStatusIcon = (): string => {
    if (!isMine) return '';

    // Check all statuses
    const allRead = message.statuses.every((s) => s.status === 'Read');
    const allDelivered = message.statuses.every(
      (s) => s.status === 'Delivered' || s.status === 'Read'
    );

    if (allRead) return 'check-all';
    if (allDelivered) return 'check-all';
    if (message.status === 'Sent') return 'check';
    if (message.status === 'Sending') return 'clock-outline';
    return 'alert-circle-outline';
  };

  const getStatusColor = (): string => {
    if (!isMine) return colors.tick;

    const allRead = message.statuses.every((s) => s.status === 'Read');
    if (allRead) return colors.tickBlue;
    return colors.tick;
  };

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    switch (message.type) {
      case 'Image':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.mediaContainer}>
            <Image
              source={{ uri: message.mediaThumbnailUrl || message.mediaUrl }}
              style={styles.imageMedia}
            />
          </TouchableOpacity>
        );
      case 'Video':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.mediaContainer}>
            <Image
              source={{ uri: message.mediaThumbnailUrl || message.mediaUrl }}
              style={styles.imageMedia}
            />
            <View style={styles.videoOverlay}>
              <Icon name="play-circle" size={48} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        );
      case 'Audio':
        return (
          <View style={styles.audioWrapper}>
            <AudioPlayer
              uri={message.mediaUrl}
              duration={message.mediaDuration || 0}
              isMine={isMine}
            />
          </View>
        );
      case 'Document':
        return (
          <TouchableOpacity
            onPress={onMediaPress}
            style={[
              styles.documentContainer,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
          >
            <View style={[styles.documentIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Icon name="file-document" size={28} color={colors.primary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={[styles.documentName, { color: colors.text }]} numberOfLines={1}>
                {message.content || 'Document'}
              </Text>
              <Text style={[styles.documentSize, { color: colors.textSecondary }]}>
                {message.mediaSize ? formatFileSize(message.mediaSize) : ''}
              </Text>
            </View>
            <Icon name="download" size={24} color={colors.primary} />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderReply = () => {
    if (!message.replyToMessage) return null;

    return (
      <TouchableOpacity
        onPress={onReplyPress}
        style={[
          styles.replyContainer,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]}
      >
        <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
        <View style={styles.replyContent}>
          <Text style={[styles.replySender, { color: colors.primary }]} numberOfLines={1}>
            {message.replyToMessage.senderName}
          </Text>
          <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={1}>
            {message.replyToMessage.isDeleted
              ? 'This message was deleted'
              : message.replyToMessage.type === 'Audio'
              ? '🎤 Voice message'
              : message.replyToMessage.type === 'Image'
              ? '📷 Photo'
              : message.replyToMessage.type === 'Video'
              ? '🎥 Video'
              : message.replyToMessage.type === 'Document'
              ? '📄 Document'
              : message.replyToMessage.content || message.replyToMessage.type}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // For audio messages, render without the outer bubble styling
  if (message.type === 'Audio') {
    return (
      <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
        <View style={styles.audioMessageContainer}>
          {showSenderName && !isMine && message.senderName && (
            <Text style={[styles.senderName, { color: colors.primary }]}>
              {message.senderName}
            </Text>
          )}

          {renderReply()}

          <AudioPlayer
            uri={message.mediaUrl!}
            duration={message.mediaDuration || 0}
            isMine={isMine}
          />

          <View style={styles.audioFooter}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {format(new Date(message.createdAt), 'HH:mm')}
            </Text>
            {isMine && (
              <Icon
                name={getStatusIcon()}
                size={16}
                color={getStatusColor()}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          isMine
            ? [styles.bubbleMine, { backgroundColor: colors.chatBubbleSent }]
            : [styles.bubbleOther, { backgroundColor: colors.chatBubbleReceived }],
        ]}
      >
        {/* Sender name with Service Number watermark */}
        {showSenderName && !isMine && (
          <View style={styles.senderInfoContainer}>
            {message.senderName && (
              <Text style={[styles.senderName, { color: colors.primary }]}>
                {message.senderName}
              </Text>
            )}
            {message.senderServiceNumber && (
              <Text style={[styles.serviceNumberWatermark, { color: colors.textMuted }]}>
                SN: {message.senderServiceNumber}
              </Text>
            )}
          </View>
        )}

        {/* Service Number watermark for own messages */}
        {isMine && message.senderServiceNumber && (
          <Text style={[styles.serviceNumberWatermark, styles.serviceNumberRight, { color: colors.textMuted }]}>
            SN: {message.senderServiceNumber}
          </Text>
        )}

        {renderReply()}
        {renderMedia()}

        {/* Enhanced forwarded indicator with original sender info */}
        {message.isForwarded && (
          <View style={styles.forwardedContainer}>
            <Icon name="share" size={12} color={colors.textMuted} />
            <View style={styles.forwardedInfo}>
              <Text style={[styles.forwardedText, { color: colors.textMuted }]}>
                Forwarded {message.forwardCount && message.forwardCount > 1 ? `(${message.forwardCount}x)` : ''}
              </Text>
              {message.originalSenderServiceNumber && (
                <Text style={[styles.originalSenderText, { color: colors.textMuted }]}>
                  Original: SN {message.originalSenderServiceNumber}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Media originator watermark for attachments */}
        {message.mediaUrl && message.mediaOriginatorServiceNumber && message.mediaOriginatorServiceNumber !== message.senderServiceNumber && (
          <Text style={[styles.mediaOriginatorWatermark, { color: colors.textMuted }]}>
            Media by: SN {message.mediaOriginatorServiceNumber}
          </Text>
        )}

        {message.content && message.type === 'Text' && (
          <Text style={[styles.content, { color: colors.text }]}>
            {message.content}
          </Text>
        )}

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
            {/* Group reactions by emoji and count */}
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <View key={emoji} style={[styles.reactionBadge, { backgroundColor: colors.divider }]}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && (
                  <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{count}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          {message.isEdited && (
            <Text style={[styles.editedText, { color: colors.textMuted }]}>edited</Text>
          )}
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {format(new Date(message.createdAt), 'HH:mm')}
          </Text>
          {isMine && (
            <Icon
              name={getStatusIcon()}
              size={16}
              color={getStatusColor()}
              style={styles.statusIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
  },
  containerMine: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  bubbleMine: {
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },
  bubbleOther: {
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    fontStyle: 'italic',
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.sm,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  replyContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  replyBar: {
    width: 4,
  },
  replyContent: {
    flex: 1,
    padding: SPACING.xs,
  },
  replySender: {
    fontWeight: 'bold',
    fontSize: FONTS.sizes.xs,
  },
  replyText: {
    fontSize: FONTS.sizes.xs,
  },
  mediaContainer: {
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  imageMedia: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  audioWrapper: {
    marginBottom: SPACING.xs,
    marginHorizontal: -SPACING.md + SPACING.xs,
  },
  audioMessageContainer: {
    maxWidth: '80%',
  },
  audioFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingHorizontal: SPACING.sm,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    minWidth: 200,
  },
  documentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  documentInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  documentName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  documentSize: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  senderInfoContainer: {
    marginBottom: SPACING.xs,
  },
  serviceNumberWatermark: {
    fontSize: FONTS.sizes.xs - 1,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  serviceNumberRight: {
    textAlign: 'right',
    marginBottom: SPACING.xs,
  },
  forwardedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  forwardedInfo: {
    marginLeft: SPACING.xs,
    flex: 1,
  },
  forwardedText: {
    fontSize: FONTS.sizes.xs,
    fontStyle: 'italic',
  },
  originalSenderText: {
    fontSize: FONTS.sizes.xs - 1,
    fontStyle: 'italic',
    marginTop: 2,
  },
  mediaOriginatorWatermark: {
    fontSize: FONTS.sizes.xs - 1,
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: SPACING.xs,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 2,
  },
  content: {
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  editedText: {
    fontSize: FONTS.sizes.xs,
    fontStyle: 'italic',
    marginRight: SPACING.xs,
  },
  time: {
    fontSize: FONTS.sizes.xs,
  },
  statusIcon: {
    marginLeft: SPACING.xs,
  },
});

export default MessageBubble;
