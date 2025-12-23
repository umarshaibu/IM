import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from './Avatar';
import { Conversation } from '../types';
import { COLORS, FONTS, SPACING } from '../utils/theme';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
}) => {
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
      default:
        return prefix + 'Message';
    }
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
            {conversation.lastMessage?.senderId === currentUserId && (
              <Icon
                name={
                  conversation.lastMessage?.statuses?.every((s) => s.status === 'Read')
                    ? 'check-all'
                    : conversation.lastMessage?.statuses?.every(
                        (s) => s.status === 'Delivered' || s.status === 'Read'
                      )
                    ? 'check-all'
                    : 'check'
                }
                size={16}
                color={
                  conversation.lastMessage?.statuses?.every((s) => s.status === 'Read')
                    ? COLORS.tickBlue
                    : COLORS.tick
                }
                style={styles.statusIcon}
              />
            )}
            <Text style={styles.lastMessage} numberOfLines={1}>
              {getLastMessagePreview()}
            </Text>
          </View>

          <View style={styles.badges}>
            {conversation.isMuted && (
              <Icon name="volume-off" size={16} color={COLORS.textMuted} style={styles.muteIcon} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  time: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  timeUnread: {
    color: COLORS.secondary,
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
    color: COLORS.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muteIcon: {
    marginRight: SPACING.xs,
  },
  unreadBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  unreadCount: {
    color: COLORS.textLight,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
});

export default ConversationItem;
