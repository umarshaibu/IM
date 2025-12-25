import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { FONTS, SPACING } from '../utils/theme';

interface MessageSelectionBarProps {
  selectedCount: number;
  onClose: () => void;
  onDelete: () => void;
  onForward: () => void;
  onCopy: () => void;
  onReply: () => void;
  onStar: () => void;
  canCopy: boolean;
  canReply: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}

const MessageSelectionBar: React.FC<MessageSelectionBarProps> = ({
  selectedCount,
  onClose,
  onDelete,
  onForward,
  onCopy,
  onReply,
  onStar,
  canCopy,
  canReply,
  canEdit,
  onEdit,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.countText}>{selectedCount}</Text>
      </View>

      <View style={styles.actionsSection}>
        {canReply && selectedCount === 1 && (
          <TouchableOpacity onPress={onReply} style={styles.actionButton}>
            <Icon name="reply" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onStar} style={styles.actionButton}>
          <Icon name="star-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Icon name="delete-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {canCopy && selectedCount === 1 && (
          <TouchableOpacity onPress={onCopy} style={styles.actionButton}>
            <Icon name="content-copy" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onForward} style={styles.actionButton}>
          <Icon name="share" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {canEdit && onEdit && selectedCount === 1 && (
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Icon name="pencil-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingBottom: SPACING.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
});

export default MessageSelectionBar;
