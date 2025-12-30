import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { usersApi, conversationsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { User } from '../../types';
import { FONTS, SPACING } from '../../utils/theme';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

type NewGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NewGroupScreen: React.FC = () => {
  const navigation = useNavigation<NewGroupScreenNavigationProp>();
  const { userId } = useAuthStore();
  const { addConversation } = useChatStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await usersApi.getAll();
      return (response.data as User[]).filter(user => user.id !== userId);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await conversationsApi.createGroup({
        name: groupName,
        description: groupDescription,
        memberIds: selectedUsers.map((u) => u.id),
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Add conversation to store before navigating
      addConversation(data);
      navigation.replace('Chat', { conversationId: data.id });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create group');
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleNext = () => {
    if (selectedUsers.length < 1) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }
    setStep('details');
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    createGroupMutation.mutate();
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (step === 'details') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.groupIconContainer}>
            <View style={styles.groupIcon}>
              <Icon name="camera" size={32} color={colors.textInverse} />
            </View>
            <Text style={styles.addPhotoText}>Add group icon</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name"
            placeholderTextColor={colors.textMuted}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />

          <TextInput
            style={styles.groupDescInput}
            placeholder="Group description (optional)"
            placeholderTextColor={colors.textMuted}
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
            maxLength={200}
          />

          <Text style={styles.participantsLabel}>
            Participants: {selectedUsers.length}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.selectedList}>
              {selectedUsers.map((user) => (
                <View key={user.id} style={styles.selectedItem}>
                  <Avatar
                    uri={user.profilePictureUrl}
                    name={user.displayName || user.fullName || ''}
                    size={50}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {user.displayName || user.fullName}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.fab, createGroupMutation.isPending && styles.fabDisabled]}
          onPress={handleCreate}
          disabled={createGroupMutation.isPending}
        >
          {createGroupMutation.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Icon name="check" size={28} color={colors.textInverse} />
          )}
        </TouchableOpacity>
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
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedWrapper}>
          <Text style={styles.selectedCount}>{selectedUsers.length} selected</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedContainer}
            contentContainerStyle={styles.selectedContentContainer}
          >
            {selectedUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.selectedChip}
                onPress={() => toggleUser(user)}
              >
                <Avatar
                  uri={user.profilePictureUrl}
                  name={user.displayName || user.fullName || ''}
                  size={36}
                />
                <Text style={styles.selectedChipName} numberOfLines={1}>
                  {(user.displayName || user.fullName || '').split(' ')[0]}
                </Text>
                <View style={styles.removeIcon}>
                  <Icon name="close" size={10} color={colors.textInverse} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {selectedUsers.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNext}>
          <Icon name="arrow-right" size={28} color={colors.textInverse} />
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
  selectedWrapper: {
    backgroundColor: colors.background,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  selectedCount: {
    fontSize: FONTS.sizes.xs,
    color: colors.textMuted,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  selectedContainer: {
    maxHeight: 70,
  },
  selectedContentContainer: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  selectedChip: {
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
    width: 50,
  },
  selectedChipName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    width: 50,
  },
  removeIcon: {
    position: 'absolute',
    top: -2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabDisabled: {
    opacity: 0.7,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  groupIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addPhotoText: {
    fontSize: FONTS.sizes.sm,
    color: colors.secondary,
    fontWeight: '500',
  },
  groupNameInput: {
    fontSize: FONTS.sizes.lg,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  groupDescInput: {
    fontSize: FONTS.sizes.md,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    minHeight: 60,
  },
  participantsLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: SPACING.md,
  },
  selectedList: {
    flexDirection: 'row',
  },
  selectedItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 70,
  },
  selectedName: {
    fontSize: FONTS.sizes.xs,
    color: colors.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default NewGroupScreen;
