import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { contactsApi, conversationsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Contact } from '../../types';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

type NewGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NewGroupScreen: React.FC = () => {
  const navigation = useNavigation<NewGroupScreenNavigationProp>();
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await contactsApi.getAll();
      return response.data as Contact[];
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await conversationsApi.createGroup({
        name: groupName,
        description: groupDescription,
        memberIds: selectedContacts.map((c) => c.contactUserId),
      });
      return response.data;
    },
    onSuccess: (data) => {
      navigation.replace('Chat', { conversationId: data.id });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create group');
    },
  });

  const filteredContacts = contacts?.filter((contact) =>
    contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (contact: Contact) => {
    setSelectedContacts((prev) => {
      const isSelected = prev.some((c) => c.contactUserId === contact.contactUserId);
      if (isSelected) {
        return prev.filter((c) => c.contactUserId !== contact.contactUserId);
      }
      return [...prev, contact];
    });
  };

  const isSelected = (contact: Contact) =>
    selectedContacts.some((c) => c.contactUserId === contact.contactUserId);

  const handleNext = () => {
    if (selectedContacts.length < 1) {
      Alert.alert('Error', 'Please select at least one contact');
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

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => toggleContact(item)}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName || ''}
        size={50}
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
          <Icon name="check" size={16} color={COLORS.textLight} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (step === 'details') {
    return (
      <View style={styles.container}>
        <View style={styles.detailsContainer}>
          <TouchableOpacity style={styles.groupIconContainer}>
            <View style={styles.groupIcon}>
              <Icon name="camera" size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.addPhotoText}>Add group icon</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name"
            placeholderTextColor={COLORS.textMuted}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />

          <TextInput
            style={styles.groupDescInput}
            placeholder="Group description (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
            maxLength={200}
          />

          <Text style={styles.participantsLabel}>
            Participants: {selectedContacts.length}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.selectedList}>
              {selectedContacts.map((contact) => (
                <View key={contact.contactUserId} style={styles.selectedItem}>
                  <Avatar
                    uri={contact.profilePictureUrl}
                    name={contact.displayName || contact.fullName || ''}
                    size={50}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {contact.displayName || contact.fullName}
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
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Icon name="check" size={28} color={COLORS.textLight} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedContacts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedContainer}
        >
          {selectedContacts.map((contact) => (
            <TouchableOpacity
              key={contact.contactUserId}
              style={styles.selectedChip}
              onPress={() => toggleContact(contact)}
            >
              <Avatar
                uri={contact.profilePictureUrl}
                name={contact.displayName || contact.fullName || ''}
                size={40}
              />
              <View style={styles.removeIcon}>
                <Icon name="close" size={12} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.contactUserId}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No contacts found</Text>
          </View>
        }
      />

      {selectedContacts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNext}>
          <Icon name="arrow-right" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  selectedContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  selectedChip: {
    marginRight: SPACING.sm,
    position: 'relative',
  },
  removeIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.textSecondary,
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
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  contactAbout: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 82,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addPhotoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  groupNameInput: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  groupDescInput: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    minHeight: 60,
  },
  participantsLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default NewGroupScreen;
