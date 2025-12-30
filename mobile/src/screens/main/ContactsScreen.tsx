import React, { useCallback, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { contactsApi, conversationsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ContactsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Contact {
  id: string;
  userId: string;
  displayName?: string;
  fullName: string;
  profilePictureUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<ContactsScreenNavigationProp>();
  const { userId } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: contacts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await contactsApi.getAll();
      return response.data as Contact[];
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredContacts = React.useMemo(() => {
    if (!contacts) return [];
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.displayName?.toLowerCase().includes(query) ||
        contact.fullName.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleContactPress = async (contact: Contact) => {
    try {
      // Create or get existing conversation with this contact
      const response = await conversationsApi.createPrivate(contact.userId);
      const conversation = response.data;

      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: contact.displayName || contact.fullName,
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName}
        size={50}
        showOnline={true}
        isOnline={item.isOnline}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.displayName || item.fullName}
        </Text>
        {item.isOnline ? (
          <Text style={styles.onlineStatus}>Online</Text>
        ) : item.lastSeen ? (
          <Text style={styles.lastSeen}>Last seen recently</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="account-group-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No contacts yet</Text>
      <Text style={styles.emptySubtitle}>
        Your contacts will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id || item.userId}
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
        contentContainerStyle={!filteredContacts?.length ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  listContent: {
    paddingBottom: 100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  onlineStatus: {
    fontSize: FONTS.sizes.sm,
    color: colors.online,
    marginTop: 2,
  },
  lastSeen: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
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
    lineHeight: 22,
  },
});

export default ContactsScreen;
