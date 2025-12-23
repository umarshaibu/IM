import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { Message } from '../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';

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
  if (message.isDeleted) {
    return (
      <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
        <View style={[styles.bubble, styles.deletedBubble]}>
          <Icon name="cancel" size={16} color={COLORS.textMuted} />
          <Text style={styles.deletedText}>This message was deleted</Text>
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
    if (!isMine) return COLORS.tick;

    const allRead = message.statuses.every((s) => s.status === 'Read');
    if (allRead) return COLORS.tickBlue;
    return COLORS.tick;
  };

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    switch (message.type) {
      case 'Image':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.mediaContainer}>
            <Image source={{ uri: message.mediaThumbnailUrl || message.mediaUrl }} style={styles.imageMedia} />
          </TouchableOpacity>
        );
      case 'Video':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.mediaContainer}>
            <Image source={{ uri: message.mediaThumbnailUrl || message.mediaUrl }} style={styles.imageMedia} />
            <View style={styles.videoOverlay}>
              <Icon name="play-circle" size={48} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>
        );
      case 'Audio':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.audioContainer}>
            <Icon name="play-circle" size={32} color={COLORS.primary} />
            <View style={styles.audioProgress} />
            <Text style={styles.audioDuration}>
              {message.mediaDuration ? `${Math.floor(message.mediaDuration / 60)}:${String(message.mediaDuration % 60).padStart(2, '0')}` : '0:00'}
            </Text>
          </TouchableOpacity>
        );
      case 'Document':
        return (
          <TouchableOpacity onPress={onMediaPress} style={styles.documentContainer}>
            <Icon name="file-document" size={32} color={COLORS.primary} />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {message.content || 'Document'}
              </Text>
              <Text style={styles.documentSize}>
                {message.mediaSize ? `${(message.mediaSize / 1024).toFixed(1)} KB` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderReply = () => {
    if (!message.replyToMessage) return null;

    return (
      <TouchableOpacity onPress={onReplyPress} style={styles.replyContainer}>
        <View style={styles.replyBar} />
        <View style={styles.replyContent}>
          <Text style={styles.replySender} numberOfLines={1}>
            {message.replyToMessage.senderName}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {message.replyToMessage.isDeleted
              ? 'This message was deleted'
              : message.replyToMessage.content || message.replyToMessage.type}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        {showSenderName && !isMine && message.senderName && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}

        {renderReply()}
        {renderMedia()}

        {message.isForwarded && (
          <View style={styles.forwardedContainer}>
            <Icon name="share" size={12} color={COLORS.textMuted} />
            <Text style={styles.forwardedText}>Forwarded</Text>
          </View>
        )}

        {message.content && (
          <Text style={[styles.content, isMine ? styles.contentMine : styles.contentOther]}>
            {message.content}
          </Text>
        )}

        <View style={styles.footer}>
          {message.isEdited && (
            <Text style={styles.editedText}>edited</Text>
          )}
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
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
    backgroundColor: COLORS.chatBubbleSent,
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },
  bubbleOther: {
    backgroundColor: COLORS.chatBubbleReceived,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
  },
  deletedBubble: {
    backgroundColor: COLORS.divider,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.sm,
  },
  senderName: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  replyContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  replyBar: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  replyContent: {
    flex: 1,
    padding: SPACING.xs,
  },
  replySender: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.xs,
  },
  replyText: {
    color: COLORS.textSecondary,
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
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  audioProgress: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.sm,
    borderRadius: 2,
  },
  audioDuration: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  documentInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  documentName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  documentSize: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  forwardedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  forwardedText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontStyle: 'italic',
    marginLeft: SPACING.xs,
  },
  content: {
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
  },
  contentMine: {
    color: COLORS.text,
  },
  contentOther: {
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  editedText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontStyle: 'italic',
    marginRight: SPACING.xs,
  },
  time: {
    fontSize: FONTS.sizes.xs,
  },
  timeMine: {
    color: COLORS.textSecondary,
  },
  timeOther: {
    color: COLORS.textSecondary,
  },
  statusIcon: {
    marginLeft: SPACING.xs,
  },
});

export default MessageBubble;
