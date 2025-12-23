import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { usersApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

interface BlockedUser {
  id: string;
  blockedUserId: string;
  displayName: string;
  fullName: string;
  profilePictureUrl?: string;
  blockedAt: string;
}

const BlockedUsersScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: blockedUsers, isLoading } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      const response = await usersApi.getBlockedUsers();
      return response.data as BlockedUser[];
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      await usersApi.unblockUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to unblock user');
    },
  });

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${user.displayName || user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => unblockMutation.mutate(user.blockedUserId),
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUnblock(item)}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName}
        size={50}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.displayName || item.fullName}
        </Text>
        <Text style={styles.userHint}>Tap to unblock</Text>
      </View>
      <Icon name="close-circle" size={24} color={COLORS.error} />
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-check" size={80} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>No blocked contacts</Text>
      <Text style={styles.emptySubtitle}>
        Blocked contacts will appear here. Tap to unblock them.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={
          !blockedUsers?.length ? styles.emptyListContent : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: COLORS.text,
  },
  userHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 82,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BlockedUsersScreen;
