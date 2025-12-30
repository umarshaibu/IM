import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConversationItem from '../../components/ConversationItem';
import { conversationsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Conversation } from '../../types';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ArchivedChatsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ArchivedChatsScreen: React.FC = () => {
  const navigation = useNavigation<ArchivedChatsScreenNavigationProp>();
  const { userId } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: allConversations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.getAll();
      return response.data as Conversation[];
    },
  });

  // Filter only archived conversations
  const archivedConversations = React.useMemo(() => {
    return allConversations.filter((c) => c.isArchived);
  }, [allConversations]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await conversationsApi.archive(conversationId, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Failed to unarchive:', error);
      Alert.alert('Error', 'Failed to unarchive conversation');
    },
  });

  const handleConversationPress = (conversation: Conversation) => {
    const title = conversation.type === 'Private'
      ? conversation.participants.find((p) => p.userId !== userId)?.displayName ||
        conversation.participants.find((p) => p.userId !== userId)?.fullName ||
        'Chat'
      : conversation.name || 'Group';

    navigation.navigate('Chat', { conversationId: conversation.id, title });
  };

  const handleConversationLongPress = (conversation: Conversation) => {
    Alert.alert(
      'Unarchive Chat',
      'Would you like to unarchive this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: () => unarchiveMutation.mutate(conversation.id),
        },
      ]
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="archive-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No archived chats</Text>
      <Text style={styles.emptySubtitle}>
        Archived chats will appear here. Long press on a chat to archive it.
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      currentUserId={userId || ''}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleConversationLongPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Archived Chats
            </Text>
            <Text style={styles.headerSubtitle}>
              {archivedConversations.length} {archivedConversations.length === 1 ? 'chat' : 'chats'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Icon name="information-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Long press on a chat to unarchive it
        </Text>
      </View>

      <FlatList
        data={archivedConversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={archivedConversations.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: SPACING.md,
    backgroundColor: colors.header,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    opacity: 0.8,
    color: colors.headerText,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: colors.surface,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    flex: 1,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  separator: {
    height: 1,
    marginLeft: 88,
    backgroundColor: colors.divider,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: colors.primary + '15',
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSecondary,
  },
});

export default ArchivedChatsScreen;
