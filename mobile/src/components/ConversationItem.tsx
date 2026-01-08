import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from './Avatar';
import { Conversation } from '../types';
import { useTheme, ThemeColors } from '../context';
import { FONTS, SPACING } from '../utils/theme';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
  isTyping?: boolean;
  typingUserName?: string;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
  isTyping = false,
  typingUserName,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [decryptedPreview, setDecryptedPreview] = useState<string>('');

  const getDisplayName = (): string => {
    if (conversation.type === 'Group') {
      return conversation.name || 'Group';
    }
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== currentUserId
    );
    return otherParticipant?.displayName || otherParticipant?.fullName || 'Unknown';
  };

  const getAvatarUri = (): string | null => {
    if (conversation.type === 'Group') {
      return conversation.iconUrl || null;
    }
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== currentUserId
    );
    return otherParticipant?.profilePictureUrl || null;
  };

  const isOnline = (): boolean => {
    if (conversation.type === 'Group') return false;
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== currentUserId
    );
    return otherParticipant?.isOnline || false;
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'dd/MM/yyyy');
  };

  const getLastMessagePreview = (): string => {
    const msg = conversation.lastMessage;
    if (!msg) return '';

    if (msg.isDeleted) return 'This message was deleted';

    const prefix = msg.senderId === currentUserId ? 'You: ' : '';

    switch (msg.type) {
      case 'Text':
        return prefix + (decryptedPreview || msg.content || '');
      case 'Image':
        return prefix + '📷 Photo';
      case 'Video':
        return prefix + '🎥 Video';
      case 'Audio':
        return prefix + '🎵 Audio';
      case 'Document':
        return prefix + '📄 Document';
      case 'Location':
        return prefix + '📍 Location';
      case 'Contact':
        return prefix + '👤 Contact';
      case 'Sticker':
        return prefix + '🎨 Sticker';
      case 'MissedCall':
        return msg.senderId === currentUserId ? '📞 Voice call - No answer' : '📞 Missed voice call';
      case 'MissedVideoCall':
        return msg.senderId === currentUserId ? '📹 Video call - No answer' : '📹 Missed video call';
      case 'System':
        return msg.content || 'System message';
      default:
        return prefix + 'Message';
    }
  };

  // Get the aggregated message status for display
  const getMessageStatus = (): 'Sent' | 'Delivered' | 'Read' => {
    const msg = conversation.lastMessage;
    if (!msg || !msg.statuses || msg.statuses.length === 0) {
      return 'Sent';
    }

    // Filter out the sender's own status (if present)
    const recipientStatuses = msg.statuses.filter(s => s.userId !== currentUserId);

    if (recipientStatuses.length === 0) {
      return 'Sent';
    }

    // For private chats (1 recipient): show the recipient's status
    // For group chats: show 'Read' only if ALL recipients have read
    const allRead = recipientStatuses.every(s => s.status === 'Read');
    if (allRead) {
      return 'Read';
    }

    // Show 'Delivered' if at least one recipient has received it
    const anyDelivered = recipientStatuses.some(s => s.status === 'Delivered' || s.status === 'Read');
    if (anyDelivered) {
      return 'Delivered';
    }

    return 'Sent';
  };

  const getMessageStatusIcon = (): string => {
    const status = getMessageStatus();
    switch (status) {
      case 'Read':
        return 'check-all';
      case 'Delivered':
        return 'check-all';
      case 'Sent':
      default:
        return 'check';
    }
  };

  const getMessageStatusColor = (): string => {
    const status = getMessageStatus();
    return status === 'Read' ? colors.tickBlue : colors.tick;
  };

  // Update preview when last message changes
  useEffect(() => {
    const msg = conversation.lastMessage;
    if (msg && msg.type === 'Text' && msg.content && !msg.isDeleted) {
      // TODO: Decrypt when proper E2E encryption is implemented
      setDecryptedPreview(msg.content);
    }
  }, [conversation.lastMessage?.content, conversation.id]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Avatar
        uri={getAvatarUri()}
        name={getDisplayName()}
        size={56}
        showOnline={conversation.type === 'Private'}
        isOnline={isOnline()}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {getDisplayName()}
          </Text>
          <Text style={[styles.time, conversation.unreadCount > 0 && styles.timeUnread]}>
            {formatTime(conversation.lastMessageAt || conversation.createdAt)}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.messagePreview}>
            {isTyping ? (
              <Text style={[styles.typingText, { color: colors.primary }]} numberOfLines={1}>
                {conversation.type === 'Group' && typingUserName
                  ? `${typingUserName} is typing...`
                  : 'typing...'}
              </Text>
            ) : (
              <>
                {conversation.lastMessage?.senderId === currentUserId && (
                  <Icon
                    name={getMessageStatusIcon()}
                    size={16}
                    color={getMessageStatusColor()}
                    style={styles.statusIcon}
                  />
                )}
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {getLastMessagePreview()}
                </Text>
              </>
            )}
          </View>

          <View style={styles.badges}>
            {conversation.isMuted && (
              <Icon name="volume-off" size={16} color={colors.textMuted} style={styles.muteIcon} />
            )}
            {conversation.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginRight: SPACING.sm,
  },
  time: {
    fontSize: FONTS.sizes.xs,
    color: colors.textSecondary,
  },
  timeUnread: {
    color: colors.secondary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: SPACING.xs,
  },
  lastMessage: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  typingText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontStyle: 'italic',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muteIcon: {
    marginRight: SPACING.xs,
  },
  unreadBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
});

export default ConversationItem;
