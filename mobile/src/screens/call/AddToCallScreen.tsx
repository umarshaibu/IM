import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { contactsApi } from '../../services/api';
import * as signalr from '../../services/signalr';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { RootStackParamList } from '../../navigation/RootNavigator';

type AddToCallRouteProp = RouteProp<RootStackParamList, 'AddToCall'>;

interface Contact {
  userId: string;
  displayName: string;
  fullName: string;
  profilePictureUrl?: string;
  isOnline: boolean;
}

const AddToCallScreen: React.FC = () => {
  const route = useRoute<AddToCallRouteProp>();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { callId, existingParticipants = [], callType } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await contactsApi.getAll();
      return response.data || [];
    },
  });

  // Filter contacts - exclude those already in the call
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact: Contact) => {
      // Exclude existing participants
      if (existingParticipants.includes(contact.userId)) {
        return false;
      }
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (contact.displayName || contact.fullName || '').toLowerCase();
        return name.includes(query);
      }
      return true;
    });
  }, [contacts, existingParticipants, searchQuery]);

  const toggleContactSelection = (userId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleInvite = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('No contacts selected', 'Please select at least one contact to invite.');
      return;
    }

    if (!callId) {
      Alert.alert('Error', 'No active call found.');
      return;
    }

    setIsInviting(true);

    try {
      // Invite each selected contact to the call
      for (const userId of selectedContacts) {
        await signalr.inviteToCall(callId, userId);
      }

      Alert.alert(
        'Invitations Sent',
        `${selectedContacts.length} contact(s) have been invited to the call.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error inviting to call:', error);
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.includes(item.userId);

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && { backgroundColor: colors.primary + '20' },
        ]}
        onPress={() => toggleContactSelection(item.userId)}
      >
        <View style={styles.contactInfo}>
          <Avatar
            uri={item.profilePictureUrl}
            name={item.displayName || item.fullName}
            size={50}
          />
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>
              {item.displayName || item.fullName}
            </Text>
            <Text style={[styles.contactStatus, { color: item.isOnline ? colors.success : colors.textSecondary }]}>
              {item.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={[
          styles.checkbox,
          { borderColor: isSelected ? colors.primary : colors.textTertiary },
          isSelected && { backgroundColor: colors.primary },
        ]}>
          {isSelected && (
            <Icon name="check" size={16} color={colors.textInverse} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Add to Call
            </Text>
            <Text style={styles.headerSubtitle}>
              {callType === 'Video' ? 'Video' : 'Voice'} Call
            </Text>
          </View>
          <View style={styles.headerRight}>
            {selectedContacts.length > 0 && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.inviteButtonText}>
                    Invite ({selectedContacts.length})
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selected contacts chips */}
      {selectedContacts.length > 0 && (
        <View style={styles.selectedContainer}>
          <FlatList
            horizontal
            data={selectedContacts}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const contact = contacts.find((c: Contact) => c.userId === item);
              if (!contact) return null;
              return (
                <TouchableOpacity
                  style={[styles.selectedChip, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => toggleContactSelection(item)}
                >
                  <Avatar
                    uri={contact.profilePictureUrl}
                    name={contact.displayName || contact.fullName}
                    size={24}
                  />
                  <Text style={[styles.selectedChipText, { color: colors.primary }]} numberOfLines={1}>
                    {contact.displayName || contact.fullName}
                  </Text>
                  <Icon name="close" size={16} color={colors.primary} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Contacts list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-search" size={60} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No contacts found' : 'No contacts available to add'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item: Contact) => item.userId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  headerRight: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  inviteButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.primary,
  },
  inviteButtonText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    height: 44,
    backgroundColor: colors.inputBackground,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: colors.text,
  },
  selectedContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.surface,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
    marginRight: SPACING.sm,
    maxWidth: 150,
  },
  selectedChipText: {
    marginHorizontal: SPACING.xs,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: colors.card,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactDetails: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  contactName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: colors.text,
  },
  contactStatus: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
    backgroundColor: colors.divider,
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
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.md,
    color: colors.textSecondary,
  },
});

export default AddToCallScreen;
