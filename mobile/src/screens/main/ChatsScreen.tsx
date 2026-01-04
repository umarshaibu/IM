import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Text,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import ConversationItem from '../../components/ConversationItem';
import MediaPicker, { SelectedMedia } from '../../components/MediaPicker';
import Avatar from '../../components/Avatar';
import { conversationsApi, filesApi } from '../../services/api';
import { sendMessage } from '../../services/signalr';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { conversationDBService } from '../../database/services';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Conversation } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ChatsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'personal' | 'groups';

const ChatsScreen: React.FC = () => {
  const navigation = useNavigation<ChatsScreenNavigationProp>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userId } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [showConversationPicker, setShowConversationPicker] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const queryClient = useQueryClient();

  // Subscribe to all typing users to show in chat list
  // Using JSON.stringify for deep comparison since typingUsers is a nested object
  const typingUsersRaw = useChatStore((state) => state.typingUsers);
  const typingUsersKey = JSON.stringify(typingUsersRaw);
  const typingUsers = React.useMemo(() => typingUsersRaw, [typingUsersKey]);

  // Check network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Load conversations from local database first (for offline support)
  useEffect(() => {
    const loadFromLocalDB = async () => {
      try {
        const localConversations = await conversationDBService.getActiveConversations();
        if (localConversations.length > 0 && conversations.length === 0) {
          // Convert WatermelonDB conversations to app format
          const formattedConversations: Conversation[] = localConversations.map(conv => ({
            id: conv.serverId,
            type: conv.type === 'direct' ? 'Private' : 'Group',
            name: conv.name || undefined,
            iconUrl: conv.avatarUrl || undefined,
            defaultMessageExpiry: 0 as const,
            lastMessage: conv.lastMessageContent ? {
              id: '',
              conversationId: conv.serverId,
              senderId: conv.lastMessageSenderId || '',
              content: conv.lastMessageContent,
              type: 'Text' as const,
              isForwarded: false,
              isEdited: false,
              isDeleted: false,
              status: 'Sent' as const,
              createdAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : '',
              statuses: [],
            } : undefined,
            unreadCount: conv.unreadCount || 0,
            isMuted: conv.isMuted || false,
            isArchived: false,
            isDeleted: conv.isDeleted || false,
            participants: [],
            createdAt: new Date(conv.createdAt).toISOString(),
          }));
          setConversations(formattedConversations);
          setLoadedFromCache(true);
        }
      } catch (error) {
        console.error('Error loading conversations from local DB:', error);
      }
    };

    loadFromLocalDB();
  }, []);

  // Debug: Log typing users changes
  useEffect(() => {
    console.log('ChatsScreen - typingUsers changed:', typingUsersKey);
  }, [typingUsersKey]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.getAll();
      const fetchedConversations = response.data as Conversation[];

      // Sync to local database for offline access
      try {
        await conversationDBService.syncConversations(fetchedConversations.map(conv => ({
          id: conv.id,
          type: conv.type === 'Private' ? 'Direct' : 'Group',
          name: conv.name || null,
          avatarUrl: conv.iconUrl || null,
          lastMessage: conv.lastMessage ? {
            content: conv.lastMessage.content || '',
            createdAt: conv.lastMessage.createdAt,
            senderId: conv.lastMessage.senderId,
          } : undefined,
          unreadCount: conv.unreadCount || 0,
          isMuted: conv.isMuted || false,
          isPinned: false,
          participants: conv.participants?.map(p => ({
            userId: p.userId,
            role: p.role || 'member',
            joinedAt: p.joinedAt || new Date().toISOString(),
          })) || [],
          createdAt: conv.createdAt,
          updatedAt: conv.createdAt,
        })));
      } catch (syncError) {
        console.error('Error syncing conversations to local DB:', syncError);
      }

      return fetchedConversations;
    },
    retry: isOffline ? 0 : 3,
    retryDelay: 1000,
    staleTime: isOffline ? Infinity : 0,
  });

  useEffect(() => {
    if (data) {
      // Merge server data with local state to preserve real-time updates
      // Keep local unreadCount and lastMessage if they're more recent
      const currentConversations = useChatStore.getState().conversations;
      const mergedConversations = data.map(serverConv => {
        const localConv = currentConversations.find(c => c.id === serverConv.id);
        if (localConv) {
          // Keep local unreadCount if it's higher (real-time messages arrived)
          const unreadCount = Math.max(localConv.unreadCount || 0, serverConv.unreadCount || 0);

          // Keep local lastMessage if it's more recent
          const serverLastMessageTime = serverConv.lastMessage?.createdAt
            ? new Date(serverConv.lastMessage.createdAt).getTime()
            : 0;
          const localLastMessageTime = localConv.lastMessage?.createdAt
            ? new Date(localConv.lastMessage.createdAt).getTime()
            : 0;

          const lastMessage = localLastMessageTime > serverLastMessageTime
            ? localConv.lastMessage
            : serverConv.lastMessage;
          const lastMessageAt = localLastMessageTime > serverLastMessageTime
            ? localConv.lastMessageAt
            : serverConv.lastMessageAt;

          return {
            ...serverConv,
            unreadCount,
            lastMessage,
            lastMessageAt,
          };
        }
        return serverConv;
      });

      setConversations(mergedConversations);
      setLoadedFromCache(false);
    }
  }, [data, setConversations]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await conversationsApi.archive(conversationId, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Failed to archive:', error);
      Alert.alert('Error', 'Failed to archive conversation');
    },
  });

  // Filter out archived and deleted conversations
  const nonArchivedConversations = React.useMemo(() => {
    return conversations.filter((c) => !c.isArchived && !c.isDeleted);
  }, [conversations]);

  // Count archived conversations
  const archivedCount = React.useMemo(() => {
    return conversations.filter((c) => c.isArchived).length;
  }, [conversations]);

  // Filter counts (only non-archived)
  const filterCounts = React.useMemo(() => {
    const all = nonArchivedConversations.length;
    const personal = nonArchivedConversations.filter((c) => c.type === 'Private').length;
    const groups = nonArchivedConversations.filter((c) => c.type === 'Group').length;
    return { all, personal, groups };
  }, [nonArchivedConversations]);

  // Filtered conversations (only non-archived)
  const filteredConversations = React.useMemo(() => {
    switch (activeFilter) {
      case 'personal':
        return nonArchivedConversations.filter((c) => c.type === 'Private');
      case 'groups':
        return nonArchivedConversations.filter((c) => c.type === 'Group');
      default:
        return nonArchivedConversations;
    }
  }, [nonArchivedConversations, activeFilter]);

  const handleConversationPress = (conversation: Conversation) => {
    const title = conversation.type === 'Private'
      ? conversation.participants.find((p) => p.userId !== userId)?.displayName ||
        conversation.participants.find((p) => p.userId !== userId)?.fullName ||
        'Chat'
      : conversation.name || 'Group';

    navigation.navigate('Chat', { conversationId: conversation.id, title });
  };

  const handleConversationLongPress = (conversation: Conversation) => {
    const title = conversation.type === 'Private'
      ? conversation.participants.find((p) => p.userId !== userId)?.displayName ||
        conversation.participants.find((p) => p.userId !== userId)?.fullName ||
        'Chat'
      : conversation.name || 'Group';

    Alert.alert(
      title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => archiveMutation.mutate(conversation.id),
        },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Chat',
              'Are you sure you want to delete this chat? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    useChatStore.getState().softDeleteConversation(conversation.id);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleMediaSelected = (media: SelectedMedia) => {
    setSelectedMedia(media);
    setShowMediaPicker(false);
    setShowConversationPicker(true);
  };

  const handleSendMediaToConversation = async (conversation: Conversation) => {
    if (!selectedMedia) return;

    setIsSendingMedia(true);
    try {
      // Upload the media file
      const uploadResponse = await filesApi.upload(selectedMedia.uri);
      const fileData = uploadResponse.data;

      // Determine message type based on media type
      const messageType = selectedMedia.type === 'video' ? 'Video' : 'Image';

      // Send the message
      await sendMessage(
        conversation.id,
        '', // No text content
        messageType,
        fileData.id,
        undefined, // parentMessageId
        undefined  // forwardedFromId
      );

      setShowConversationPicker(false);
      setSelectedMedia(null);

      // Navigate to the chat
      const title = conversation.type === 'Private'
        ? conversation.participants.find((p) => p.userId !== userId)?.displayName ||
          conversation.participants.find((p) => p.userId !== userId)?.fullName ||
          'Chat'
        : conversation.name || 'Group';

      navigation.navigate('Chat', { conversationId: conversation.id, title });
    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setIsSendingMedia(false);
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    return conversation.type === 'Private'
      ? conversation.participants.find((p) => p.userId !== userId)?.displayName ||
        conversation.participants.find((p) => p.userId !== userId)?.fullName ||
        'Chat'
      : conversation.name || 'Group';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'Private') {
      const otherParticipant = conversation.participants.find((p) => p.userId !== userId);
      return otherParticipant?.profilePictureUrl;
    }
    return conversation.groupPictureUrl;
  };

  const renderFilterTab = (
    filter: FilterType,
    label: string,
    count: number
  ) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setActiveFilter(filter)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
          {label}
        </Text>
        <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
          <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderArchivedButton = () => {
    if (archivedCount === 0) return null;

    return (
      <TouchableOpacity
        style={styles.archivedButton}
        onPress={() => navigation.navigate('ArchivedChats')}
        activeOpacity={0.7}
      >
        <View style={styles.archivedIconContainer}>
          <Icon name="archive-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.archivedText}>Archived</Text>
        <View style={styles.archivedBadge}>
          <Text style={styles.archivedBadgeText}>{archivedCount}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="chat-processing-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with your contacts to see them here
      </Text>
      <TouchableOpacity
        style={styles.startChatButton}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.8}
      >
        <Icon name="message-plus" size={20} color={colors.textInverse} />
        <Text style={styles.startChatButtonText}>Start a new chat</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    const conversationTypingUsers = typingUsers[item.id] || [];
    const otherTypingUsers = conversationTypingUsers.filter(id => id !== userId);
    const isTyping = otherTypingUsers.length > 0;

    // Get first typing user's name for groups
    let typingUserName: string | undefined;
    if (isTyping && item.type === 'Group') {
      const typingUserId = otherTypingUsers[0];
      const participant = item.participants.find(p => p.userId === typingUserId);
      typingUserName = participant?.displayName || participant?.fullName;
    }

    return (
      <ConversationItem
        conversation={item}
        currentUserId={userId || ''}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleConversationLongPress(item)}
        isTyping={isTyping}
        typingUserName={typingUserName}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Icon name="wifi-off" size={16} color={colors.textInverse} />
          <Text style={styles.offlineBannerText}>
            You're offline. Showing cached chats.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMediaPicker(true)}
          >
            <Icon name="camera-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Icon name="magnify" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="dots-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterTab('all', 'All', filterCounts.all)}
        {renderFilterTab('personal', 'Personal', filterCounts.personal)}
        {renderFilterTab('groups', 'Groups', filterCounts.groups)}
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={typingUsers}
        ListHeaderComponent={renderArchivedButton}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredConversations.length === 0 && archivedCount === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - New Chat Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.8}
      >
        <Icon name="message-plus" size={26} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Media Picker */}
      <MediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onMediaSelected={handleMediaSelected}
      />

      {/* Conversation Picker Modal */}
      <Modal
        visible={showConversationPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowConversationPicker(false);
          setSelectedMedia(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send to...</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowConversationPicker(false);
                  setSelectedMedia(null);
                }}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {isSendingMedia ? (
              <View style={styles.sendingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.sendingText}>Sending...</Text>
              </View>
            ) : (
              <FlatList
                data={nonArchivedConversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.conversationPickerItem}
                    onPress={() => handleSendMediaToConversation(item)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      uri={getConversationAvatar(item)}
                      name={getConversationTitle(item)}
                      size={50}
                    />
                    <View style={styles.conversationPickerInfo}>
                      <Text style={styles.conversationPickerName}>
                        {getConversationTitle(item)}
                      </Text>
                      <Text style={styles.conversationPickerType}>
                        {item.type === 'Private' ? 'Private chat' : `${item.participants.length} members`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.conversationPickerSeparator} />}
                ListEmptyComponent={
                  <View style={styles.emptyPickerContainer}>
                    <Text style={styles.emptyPickerText}>No conversations available</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Dynamic styles based on theme
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: colors.warning,
  },
  offlineBannerText: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: colors.textInverse,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.md,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.primary + '15',
  },
  filterTabText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  filterBadge: {
    marginLeft: SPACING.xs,
    backgroundColor: colors.textSecondary + '30',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterBadgeActive: {
    backgroundColor: colors.primary + '20',
  },
  filterBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: colors.primary,
  },
  archivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  archivedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  archivedText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  archivedBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    marginRight: SPACING.sm,
  },
  archivedBadgeText: {
    color: colors.textInverse,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 88,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 22,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startChatButtonText: {
    color: colors.textInverse,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  sendingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
  },
  conversationPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  conversationPickerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  conversationPickerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  conversationPickerType: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  conversationPickerSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 82,
  },
  emptyPickerContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ChatsScreen;
