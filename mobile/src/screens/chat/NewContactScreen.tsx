import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { usersApi, contactsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { User, Contact } from '../../types';
import { FONTS, SPACING } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuthStore } from '../../stores/authStore';

type NewContactScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NewContactScreen: React.FC = () => {
  const navigation = useNavigation<NewContactScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await usersApi.getAll();
      return (response.data as User[]).filter(user => user.id !== userId);
    },
  });

  // Fetch existing contacts to filter them out
  const { data: existingContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await contactsApi.getAll();
      return response.data as Contact[];
    },
  });

  const existingContactIds = existingContacts?.map(c => c.contactUserId) || [];

  // Filter users who are not already contacts
  const availableUsers = users?.filter(
    user => !existingContactIds.includes(user.id)
  );

  const filteredUsers = availableUsers?.filter(user =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.serviceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addContactMutation = useMutation({
    mutationFn: async (contactUserId: string) => {
      await contactsApi.add(contactUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      Alert.alert('Success', 'Contact added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add contact');
    },
  });

  const handleAddContact = (user: User) => {
    Alert.alert(
      'Add Contact',
      `Add ${user.displayName || user.fullName} to your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => addContactMutation.mutate(user.id),
        },
      ]
    );
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleAddContact(item)}
      disabled={addContactMutation.isPending}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName || ''}
        size={50}
        isOnline={item.isOnline}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.displayName || item.fullName}
        </Text>
        <Text style={styles.userAbout} numberOfLines={1}>
          {item.about || 'Hey there! I am using IM'}
        </Text>
      </View>
      <View style={styles.addIconContainer}>
        <Icon name="account-plus" size={24} color={colors.secondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Contact</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or service number..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-search-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {availableUsers?.length === 0
                  ? 'All users are already in your contacts'
                  : 'No users found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : 'Search for users to add them as contacts'}
              </Text>
            </View>
          }
          contentContainerStyle={filteredUsers?.length === 0 ? styles.emptyListContent : undefined}
        />
      )}

      {addContactMutation.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  userAbout: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  addIconContainer: {
    padding: SPACING.sm,
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
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewContactScreen;
