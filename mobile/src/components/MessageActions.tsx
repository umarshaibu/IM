import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { Message } from '../types';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageActionsProps {
  visible: boolean;
  message: Message | null;
  isMine: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDelete: (forEveryone: boolean) => void;
  onEdit?: () => void;
  onStar: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onInfo?: () => void;
}

interface ActionItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

const ActionItem: React.FC<ActionItemProps & { colors: any }> = ({
  icon,
  label,
  onPress,
  color,
  danger,
  colors,
}) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
    <Icon
      name={icon}
      size={22}
      color={danger ? colors.error : color || colors.text}
    />
    <Text
      style={[
        styles.actionItemText,
        { color: danger ? colors.error : color || colors.text },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const MessageActions: React.FC<MessageActionsProps> = ({
  visible,
  message,
  isMine,
  onClose,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onEdit,
  onStar,
  onPin,
  onReact,
  onInfo,
}) => {
  const { colors, isDark } = useTheme();
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setShowDeleteOptions(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!message) return null;

  const handleDelete = (forEveryone: boolean) => {
    setShowDeleteOptions(false);
    onDelete(forEveryone);
    onClose();
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const canEdit = isMine && message.type === 'Text' && !message.isDeleted;
  const canDeleteForEveryone = isMine;
  const hasTextContent = message.type === 'Text' && message.content;

  const getMessagePreview = (): string => {
    if (message.isDeleted) return 'This message was deleted';
    switch (message.type) {
      case 'Image':
        return '📷 Photo';
      case 'Video':
        return '🎥 Video';
      case 'Audio':
        return '🎤 Voice message';
      case 'Document':
        return '📄 Document';
      case 'Location':
        return '📍 Location';
      case 'Contact':
        return '👤 Contact';
      case 'Text':
      default:
        return message.content || '';
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          </View>

          {/* Reactions Row - WhatsApp style */}
          <View style={[styles.reactionsContainer, { backgroundColor: isDark ? colors.surface : '#F7F7F7' }]}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => handleAction(() => onReact(emoji))}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handleAction(() => onReact('➕'))}
              activeOpacity={0.7}
            >
              <View style={[styles.addReactionButton, { backgroundColor: colors.divider }]}>
                <Icon name="plus" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Message Preview */}
          <View style={[styles.messagePreview, { borderBottomColor: colors.divider }]}>
            {message.type === 'Image' && message.mediaThumbnailUrl && (
              <Image
                source={{ uri: message.mediaThumbnailUrl }}
                style={styles.previewThumbnail}
              />
            )}
            <View style={styles.previewContent}>
              <Text style={[styles.previewSender, { color: colors.primary }]}>
                {isMine ? 'You' : message.senderName || 'Unknown'}
              </Text>
              <Text
                style={[styles.previewText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {getMessagePreview()}
              </Text>
            </View>
            <Text style={[styles.previewTime, { color: colors.textMuted }]}>
              {format(new Date(message.createdAt), 'HH:mm')}
            </Text>
          </View>

          {/* Actions List - WhatsApp style */}
          <ScrollView style={styles.actionsScrollView} bounces={false}>
            {!showDeleteOptions ? (
              <View style={styles.actionsGrid}>
                {/* Row 1 */}
                <View style={styles.actionsRow}>
                  <ActionItem
                    icon="reply"
                    label="Reply"
                    onPress={() => handleAction(onReply)}
                    colors={colors}
                  />
                  <ActionItem
                    icon="share"
                    label="Forward"
                    onPress={() => handleAction(onForward)}
                    colors={colors}
                  />
                  {hasTextContent && (
                    <ActionItem
                      icon="content-copy"
                      label="Copy"
                      onPress={() => handleAction(onCopy)}
                      colors={colors}
                    />
                  )}
                  {!hasTextContent && (
                    <ActionItem
                      icon="download"
                      label="Save"
                      onPress={() => handleAction(onCopy)}
                      colors={colors}
                    />
                  )}
                </View>

                {/* Divider */}
                <View style={[styles.actionsDivider, { backgroundColor: colors.divider }]} />

                {/* Row 2 */}
                <View style={styles.actionsRow}>
                  <ActionItem
                    icon="star-outline"
                    label="Star"
                    onPress={() => handleAction(onStar)}
                    colors={colors}
                  />
                  <ActionItem
                    icon="pin-outline"
                    label="Pin"
                    onPress={() => handleAction(onPin)}
                    colors={colors}
                  />
                  {onInfo && (
                    <ActionItem
                      icon="information-outline"
                      label="Info"
                      onPress={() => handleAction(onInfo)}
                      colors={colors}
                    />
                  )}
                  {!onInfo && canEdit && onEdit && (
                    <ActionItem
                      icon="pencil-outline"
                      label="Edit"
                      onPress={() => handleAction(onEdit)}
                      colors={colors}
                    />
                  )}
                </View>

                {/* Divider */}
                <View style={[styles.actionsDivider, { backgroundColor: colors.divider }]} />

                {/* Row 3 - Delete */}
                <View style={styles.actionsRow}>
                  <ActionItem
                    icon="delete-outline"
                    label="Delete"
                    onPress={() => setShowDeleteOptions(true)}
                    danger
                    colors={colors}
                  />
                  {canEdit && onEdit && onInfo && (
                    <ActionItem
                      icon="pencil-outline"
                      label="Edit"
                      onPress={() => handleAction(onEdit)}
                      colors={colors}
                    />
                  )}
                </View>
              </View>
            ) : (
              /* Delete Options - WhatsApp style */
              <View style={styles.deleteContainer}>
                <Text style={[styles.deleteTitle, { color: colors.text }]}>
                  Delete message?
                </Text>
                <Text style={[styles.deleteSubtitle, { color: colors.textSecondary }]}>
                  {canDeleteForEveryone
                    ? 'You can delete this message for everyone or just for yourself.'
                    : 'This message will be deleted for you only.'}
                </Text>

                <View style={styles.deleteOptions}>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    onPress={() => handleDelete(false)}
                    activeOpacity={0.7}
                  >
                    <Icon name="account" size={24} color={colors.text} />
                    <Text style={[styles.deleteButtonText, { color: colors.text }]}>
                      Delete for me
                    </Text>
                  </TouchableOpacity>

                  {canDeleteForEveryone && (
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: colors.error + '15' }]}
                      onPress={() => handleDelete(true)}
                      activeOpacity={0.7}
                    >
                      <Icon name="account-multiple" size={24} color={colors.error} />
                      <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                        Delete for everyone
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDeleteOptions(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 34, // Safe area
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  reactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    marginBottom: 8,
  },
  reactionButton: {
    padding: 4,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  addReactionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  previewThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewSender: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewText: {
    fontSize: FONTS.sizes.sm,
  },
  previewTime: {
    fontSize: FONTS.sizes.xs,
    marginLeft: 8,
  },
  actionsScrollView: {
    maxHeight: 300,
  },
  actionsGrid: {
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  actionsDivider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    minWidth: 80,
  },
  actionItemText: {
    fontSize: FONTS.sizes.xs,
    marginTop: 8,
    textAlign: 'center',
  },
  deleteContainer: {
    padding: 20,
  },
  deleteTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteSubtitle: {
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteOptions: {
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  cancelText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

export default MessageActions;
