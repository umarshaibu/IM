import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { conversationsApi } from '../../services/api';
import { forwardMessageToMultiple } from '../../services/signalr';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Conversation } from '../../types';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ForwardMessageRouteProp = RouteProp<RootStackParamList, 'ForwardMessage'>;

const ForwardMessageScreen: React.FC = () => {
  const route = useRoute<ForwardMessageRouteProp>();
  const navigation = useNavigation();
  const { messageId } = route.params;
  const { userId } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.getAll();
      return response.data as Conversation[];
    },
  });

  const handleForward = async () => {
    if (selectedConversations.length === 0) return;

    setIsForwarding(true);
    try {
      await forwardMessageToMultiple(messageId, selectedConversations);

      navigation.goBack();
    } catch (error) {
      console.error('Failed to forward message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();

    if (conv.type === 'Group') {
      return conv.name?.toLowerCase().includes(searchLower);
    }

    const otherParticipant = conv.participants.find((p) => p.userId !== userId);
    return (
      otherParticipant?.displayName?.toLowerCase().includes(searchLower) ||
      otherParticipant?.fullName?.toLowerCase().includes(searchLower)
    );
  });

  const toggleSelection = (conversationId: string) => {
    setSelectedConversations((prev) => {
      if (prev.includes(conversationId)) {
        return prev.filter((id) => id !== conversationId);
      }
      return [...prev, conversationId];
    });
  };

  const isSelected = (conversationId: string) =>
    selectedConversations.includes(conversationId);

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.type === 'Group') {
      return conversation.name || 'Group';
    }
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== userId
    );
    return otherParticipant?.displayName || otherParticipant?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.type === 'Group') {
      return conversation.iconUrl;
    }
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== userId
    );
    return otherParticipant?.profilePictureUrl;
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => toggleSelection(item.id)}
    >
      <Avatar
        uri={getConversationAvatar(item)}
        name={getConversationName(item)}
        size={50}
      />
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationName}>{getConversationName(item)}</Text>
        {item.type === 'Group' && (
          <Text style={styles.conversationMeta}>
            {item.participants.length} participants
          </Text>
        )}
      </View>
      <View style={[styles.checkbox, isSelected(item.id) && styles.checkboxSelected]}>
        {isSelected(item.id) && (
          <Icon name="check" size={16} color={colors.textInverse} />
        )}
      </View>
    </TouchableOpacity>
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
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedConversations.length > 0 && (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedText}>
            {selectedConversations.length} selected
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSelectedConversations([])}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
      />

      {selectedConversations.length > 0 && (
        <TouchableOpacity
          style={[styles.forwardButton, isForwarding && styles.forwardButtonDisabled]}
          onPress={handleForward}
          disabled={isForwarding}
        >
          {isForwarding ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Icon name="share" size={24} color={colors.textInverse} />
              <Text style={styles.forwardButtonText}>
                Forward to {selectedConversations.length} chat{selectedConversations.length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: colors.text,
  },
  selectedBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.primary,
  },
  selectedText: {
    fontSize: FONTS.sizes.md,
    color: colors.textInverse,
    fontWeight: '500',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textInverse,
    fontWeight: '600',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  conversationName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: colors.text,
  },
  conversationMeta: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 82,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
  },
  forwardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  forwardButtonDisabled: {
    opacity: 0.7,
  },
  forwardButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.textInverse,
    marginLeft: SPACING.sm,
  },
});

export default ForwardMessageScreen;
