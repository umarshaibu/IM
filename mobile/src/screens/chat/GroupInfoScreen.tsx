import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import { conversationsApi } from '../../services/api';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Participant } from '../../types';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type GroupInfoRouteProp = RouteProp<RootStackParamList, 'GroupInfo'>;
type GroupInfoNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GroupInfoScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const route = useRoute<GroupInfoRouteProp>();
  const navigation = useNavigation<GroupInfoNavigationProp>();
  const queryClient = useQueryClient();
  const { conversationId } = route.params;
  const { userId } = useAuthStore();
  const { getConversation } = useChatStore();

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const conversation = getConversation(conversationId);

  const { data: participants } = useQuery({
    queryKey: ['participants', conversationId],
    queryFn: async () => {
      const response = await conversationsApi.getParticipants(conversationId);
      return response.data as Participant[];
    },
  });

  const currentUserParticipant = participants?.find((p) => p.userId === userId);
  const isAdmin = currentUserParticipant?.role === 'Admin';

  const updateMutation = useMutation({
    mutationFn: async () => {
      await conversationsApi.update(conversationId, {
        name: groupName,
        description: groupDescription,
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await conversationsApi.leave(conversationId);
    },
    onSuccess: () => {
      navigation.popToTop();
    },
  });

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveMutation.mutate(),
        },
      ]
    );
  };

  const handleRemoveParticipant = (participantUserId: string, name: string) => {
    Alert.alert(
      'Remove Participant',
      `Remove ${name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationsApi.removeParticipant(conversationId, participantUserId);
              queryClient.invalidateQueries({ queryKey: ['participants', conversationId] });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  const handleMakeAdmin = async (participantUserId: string) => {
    try {
      await conversationsApi.updateParticipantRole(conversationId, participantUserId, 'Admin');
      queryClient.invalidateQueries({ queryKey: ['participants', conversationId] });
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const renderParticipant = ({ item }: { item: Participant }) => (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => {
        if (item.userId !== userId) {
          navigation.navigate('ContactInfo', { userId: item.userId });
        }
      }}
      onLongPress={() => {
        if (isAdmin && item.userId !== userId) {
          Alert.alert(
            item.displayName || item.fullName || 'Participant',
            'Choose an action',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: item.role === 'Admin' ? 'Remove Admin' : 'Make Admin',
                onPress: () => handleMakeAdmin(item.userId),
              },
              {
                text: 'Remove from Group',
                style: 'destructive',
                onPress: () => handleRemoveParticipant(item.userId, item.displayName || item.fullName || ''),
              },
            ]
          );
        }
      }}
    >
      <Avatar
        uri={item.profilePictureUrl}
        name={item.displayName || item.fullName || ''}
        size={50}
        isOnline={item.isOnline}
      />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {item.userId === userId ? 'You' : item.displayName || item.fullName}
        </Text>
        {item.role === 'Admin' && (
          <Text style={styles.adminBadge}>Admin</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer}>
          <Avatar
            uri={conversation?.iconUrl}
            name={conversation?.name || 'Group'}
            size={100}
          />
          {isAdmin && (
            <View style={styles.editAvatarBadge}>
              <Icon name="camera" size={20} color={colors.textInverse} />
            </View>
          )}
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.editInput, styles.descInput]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => updateMutation.mutate()}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <Text style={styles.groupName}>{conversation?.name}</Text>
            <Text style={styles.groupDesc}>
              {conversation?.description || 'No description'}
            </Text>
            <Text style={styles.memberCount}>
              {participants?.length} participants
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setGroupName(conversation?.name || '');
                  setGroupDescription(conversation?.description || '');
                  setIsEditing(true);
                }}
              >
                <Icon name="pencil" size={16} color={colors.secondary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddParticipants', {
                conversationId,
                existingParticipantIds: participants?.map(p => p.userId) || [],
              })}
            >
              <Icon name="account-plus" size={24} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLeaveGroup}
        >
          <Icon name="exit-to-app" size={24} color={colors.error} />
          <Text style={styles.leaveText}>Leave Group</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  infoContainer: {
    alignItems: 'center',
  },
  groupName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  groupDesc: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  memberCount: {
    fontSize: FONTS.sizes.sm,
    color: colors.textMuted,
    marginBottom: SPACING.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  editButtonText: {
    fontSize: FONTS.sizes.sm,
    color: colors.secondary,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  editContainer: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  editInput: {
    fontSize: FONTS.sizes.lg,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  descInput: {
    minHeight: 60,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.background,
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.secondary,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.md,
    color: colors.textInverse,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.surface,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  addButton: {
    padding: SPACING.xs,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  participantInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  participantName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: colors.text,
  },
  adminBadge: {
    fontSize: FONTS.sizes.xs,
    color: colors.secondary,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  actionsSection: {
    backgroundColor: colors.surface,
    marginBottom: SPACING.xxl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  leaveText: {
    fontSize: FONTS.sizes.lg,
    color: colors.error,
    marginLeft: SPACING.md,
    fontWeight: '500',
  },
});

export default GroupInfoScreen;
