import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { channelsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ChannelsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Channel {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  iconUrl?: string;
  memberCount: number;
  isFollowing: boolean;
}

const ChannelsScreen: React.FC = () => {
  const navigation = useNavigation<ChannelsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: channels, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      try {
        const response = await channelsApi.getAll();
        return response.data as Channel[];
      } catch (error) {
        // Return mock data if API doesn't exist yet
        return [
          { id: '1', name: 'Military Secretary', shortName: 'MS', isFollowing: false, memberCount: 150 },
          { id: '2', name: 'Department of Personnel M...', shortName: 'DPM', isFollowing: false, memberCount: 230 },
          { id: '3', name: 'HQ Finance', shortName: 'Fin', isFollowing: false, memberCount: 89 },
          { id: '4', name: 'Army Public Relations', shortName: 'APR', isFollowing: true, memberCount: 450 },
          { id: '5', name: 'Department of Civil Military A...', shortName: 'DCMA', isFollowing: false, memberCount: 120 },
          { id: '6', name: 'Armed Forces Command Staff...', shortName: 'AFCSC', isFollowing: false, memberCount: 340 },
          { id: '7', name: 'Nigerian Defence Academy', shortName: 'NDA', isFollowing: true, memberCount: 560 },
        ] as Channel[];
      }
    },
  });

  const followMutation = useMutation({
    mutationFn: async ({ channelId, follow }: { channelId: string; follow: boolean }) => {
      if (follow) {
        return channelsApi.follow(channelId);
      } else {
        return channelsApi.unfollow(channelId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredChannels = React.useMemo(() => {
    if (!channels) return [];
    if (!searchQuery.trim()) return channels;

    const query = searchQuery.toLowerCase();
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.shortName.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const handleFollowPress = (channel: Channel) => {
    followMutation.mutate({ channelId: channel.id, follow: !channel.isFollowing });
  };

  const handleChannelPress = (channel: Channel) => {
    // Navigate to channel chat/details
    navigation.navigate('Chat', {
      conversationId: channel.id,
      title: channel.name,
    });
  };

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.channelIcon}>
        {item.iconUrl ? (
          <Avatar uri={item.iconUrl} name={item.shortName} size={50} />
        ) : (
          <View style={styles.defaultIcon}>
            <Icon name="shield-star" size={28} color={COLORS.primary} />
          </View>
        )}
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelShortName}>{item.shortName}</Text>
        <Text style={styles.channelName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowing && styles.followingButton,
        ]}
        onPress={() => handleFollowPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.followButtonText,
            item.isFollowing && styles.followingButtonText,
          ]}
        >
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="broadcast" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No channels available</Text>
      <Text style={styles.emptySubtitle}>
        Official channels will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Channels</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={COLORS.textLight + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={filteredChannels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={!isLoading ? renderEmptyList : null}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={!filteredChannels?.length ? styles.emptyListContent : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.textLight,
    padding: 0,
  },
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: 100,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  channelIcon: {
    marginRight: SPACING.md,
  },
  defaultIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelShortName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  channelName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  followingButton: {
    backgroundColor: COLORS.inputBackground,
  },
  followButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  followingButtonText: {
    color: COLORS.textSecondary,
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
    padding: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ChannelsScreen;
