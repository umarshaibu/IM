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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { usersApi, conversationsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { User } from '../../types';
import { FONTS, SPACING } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type AddParticipantsRouteProp = RouteProp<RootStackParamList, 'AddParticipants'>;
type AddParticipantsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddParticipantsScreen: React.FC = () => {
  const route = useRoute<AddParticipantsRouteProp>();
  const navigation = useNavigation<AddParticipantsNavigationProp>();
  const queryClient = useQueryClient();
  const { conversationId, existingParticipantIds } = route.params;
  const { userId } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await usersApi.getAll();
      return (response.data as User[]).filter(user => user.id !== userId);
    },
  });

  // Filter out users who are already participants
  const availableUsers = users?.filter(
    (user) => !existingParticipantIds.includes(user.id)
  );

  const filteredUsers = availableUsers?.filter((user) =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addParticipantsMutation = useMutation({
    mutationFn: async () => {
      // Add each selected user to the group
      for (const user of selectedUsers) {
        await conversationsApi.addParticipant(conversationId, user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', conversationId] });
      Alert.alert('Success', 'Participants added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add participants');
    },
  });

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const isSelected = (user: User) =>
    selectedUsers.some((u) => u.id === user.id);

  const handleAdd = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }
    addParticipantsMutation.mutate();
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => toggleUser(item)}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName || ''}
        size={50}
        isOnline={item.isOnline}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.displayName || item.fullName}
        </Text>
        <Text style={styles.contactAbout} numberOfLines={1}>
          {item.about || 'Hey there! I am using IM'}
        </Text>
      </View>
      <View style={[styles.checkbox, isSelected(item) && styles.checkboxSelected]}>
        {isSelected(item) && (
          <Icon name="check" size={16} color={colors.textInverse} />
        )}
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
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Add Participants</Text>
          {selectedUsers.length > 0 && (
            <Text style={styles.selectedCount}>{selectedUsers.length} selected</Text>
          )}
        </View>
        {selectedUsers.length > 0 && (
          <TouchableOpacity
            onPress={handleAdd}
            disabled={addParticipantsMutation.isPending}
            style={styles.doneButton}
          >
            {addParticipantsMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : (
              <Text style={styles.doneText}>Add</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {availableUsers?.length === 0
                  ? 'All users are already in this group'
                  : 'No users found'}
              </Text>
            </View>
          }
        />
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
  headerTitle: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  selectedCount: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  doneButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  doneText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.secondary,
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  contactAbout: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
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
    textAlign: 'center',
  },
});

export default AddParticipantsScreen;
