import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { conversationsApi, usersApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { User } from '../../types';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

type NewChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserSection {
  title: string;
  data: User[];
}

const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NewChatScreenNavigationProp>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');
  const { userId } = useAuthStore();
  const { addConversation } = useChatStore();

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await usersApi.getAll();
      return (response.data as User[]).filter(user => user.id !== userId);
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group users alphabetically like WhatsApp
  const groupedUsers: UserSection[] = React.useMemo(() => {
    if (!filteredUsers) return [];

    const groups: { [key: string]: User[] } = {};

    filteredUsers.forEach((user) => {
      const name = user.displayName || user.fullName || '';
      const firstLetter = name.charAt(0).toUpperCase() || '#';
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(user);
    });

    return Object.keys(groups)
      .sort()
      .map((letter) => ({
        title: letter,
        data: groups[letter].sort((a, b) => {
          const nameA = a.displayName || a.fullName || '';
          const nameB = b.displayName || b.fullName || '';
          return nameA.localeCompare(nameB);
        }),
      }));
  }, [filteredUsers]);

  const handleUserPress = async (user: User) => {
    try {
      const response = await conversationsApi.getOrCreatePrivate(user.id);
      const conversation = response.data;
      // Add conversation to store before navigating
      addConversation(conversation);
      navigation.replace('Chat', { conversationId: conversation.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName || ''}
        size={50}
        isOnline={item.isOnline}
        showOnline={true}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.displayName || item.fullName}
        </Text>
        <Text style={styles.contactAbout} numberOfLines={1}>
          {item.about || 'Hey there! I am using NAIM'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: UserSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* New Group */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => navigation.navigate('NewGroup')}
        activeOpacity={0.7}
      >
        <View style={styles.actionIconContainer}>
          <Icon name="account-group" size={24} color={colors.textInverse} />
        </View>
        <Text style={styles.actionText}>New group</Text>
      </TouchableOpacity>

      {/* New Contact */}
      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => navigation.navigate('NewContact')}
        activeOpacity={0.7}
      >
        <View style={styles.actionIconContainer}>
          <Icon name="account-plus" size={24} color={colors.textInverse} />
        </View>
        <Text style={styles.actionText}>New contact</Text>
      </TouchableOpacity>

      {/* Contacts Count */}
      {users && users.length > 0 && (
        <View style={styles.contactsCountContainer}>
          <Text style={styles.contactsCountText}>
            Contacts on NAIM
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="account-search-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No users found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `No results for "${searchQuery}"`
          : 'Users on IM will appear here'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or number"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Icon name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionList
        sections={groupedUsers}
        renderItem={renderUser}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        contentContainerStyle={
          groupedUsers.length === 0 ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
      />
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: colors.text,
    padding: 0,
  },
  headerContainer: {
    backgroundColor: colors.surface,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginLeft: SPACING.md,
    flex: 1,
  },
  contactsCountContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.background,
  },
  contactsCountText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: colors.surface,
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  contactAbout: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 82,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
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
    lineHeight: 22,
  },
});

export default NewChatScreen;
