import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import Avatar from '../../components/Avatar';
import { messagesApi, usersApi, conversationsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Message, UserProfile } from '../../types';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING } from '../../utils/theme';
import { formatDistanceToNow } from 'date-fns';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SearchResult = {
  type: 'message' | 'user';
  data: Message | UserProfile;
};

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'messages' | 'users'>('all');

  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: messageResults, isLoading: messagesLoading } = useQuery({
    queryKey: ['searchMessages', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await messagesApi.search(searchQuery);
      return response.data as Message[];
    },
    enabled: searchQuery.length >= 2 && (activeTab === 'all' || activeTab === 'messages'),
  });

  const { data: userResults, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await usersApi.search(searchQuery);
      return response.data as UserProfile[];
    },
    enabled: searchQuery.length >= 2 && (activeTab === 'all' || activeTab === 'users'),
  });

  const debouncedSearch = useCallback(
    debounce((text: string) => {
      setSearchQuery(text);
    }, 300),
    []
  );

  const handleMessagePress = async (message: Message) => {
    navigation.navigate('Chat', { conversationId: message.conversationId });
  };

  const handleUserPress = async (user: UserProfile) => {
    try {
      const response = await conversationsApi.getOrCreatePrivate(user.id);
      navigation.navigate('Chat', { conversationId: response.data.id });
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const getResults = (): SearchResult[] => {
    const results: SearchResult[] = [];

    if (activeTab === 'all' || activeTab === 'users') {
      userResults?.forEach((user) => {
        results.push({ type: 'user', data: user });
      });
    }

    if (activeTab === 'all' || activeTab === 'messages') {
      messageResults?.forEach((message) => {
        results.push({ type: 'message', data: message });
      });
    }

    return results;
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'user') {
      const user = item.data as UserProfile;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleUserPress(user)}
        >
          <Avatar
            uri={user.profilePictureUrl}
            name={user.displayName || user.fullName || ''}
            size={50}
            isOnline={user.isOnline}
          />
          <View style={styles.resultInfo}>
            <Text style={styles.resultTitle}>
              {user.displayName || user.fullName}
            </Text>
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {user.about || 'Hey there! I am using IM'}
            </Text>
          </View>
          <View style={styles.resultBadge}>
            <Icon name="account" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      );
    }

    const message = item.data as Message;
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleMessagePress(message)}
      >
        <View style={styles.messageIcon}>
          <Icon name="message-text" size={24} color={colors.secondary} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle}>{message.senderName}</Text>
          <Text style={styles.resultSubtitle} numberOfLines={2}>
            {message.content}
          </Text>
          <Text style={styles.messageTime}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isLoading = messagesLoading || usersLoading;
  const results = getResults();

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages and users..."
          placeholderTextColor={colors.textMuted}
          onChangeText={debouncedSearch}
          autoFocus
        />
      </View>

      <View style={styles.tabs}>
        {(['all', 'messages', 'users'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchQuery.length < 2 ? (
        <View style={styles.emptyContainer}>
          <Icon name="magnify" size={60} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Enter at least 2 characters to search
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="file-search-outline" size={60} color={colors.textMuted} />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: colors.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  messageIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  resultTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  resultSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  messageTime: {
    fontSize: FONTS.sizes.xs,
    color: colors.textMuted,
    marginTop: SPACING.xs,
  },
  resultBadge: {
    padding: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 82,
  },
});

export default SearchScreen;
