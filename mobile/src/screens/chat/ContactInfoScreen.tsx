import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../../components/Avatar';
import { usersApi, conversationsApi, contactsApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { UserProfile } from '../../types';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

type ContactInfoRouteProp = RouteProp<RootStackParamList, 'ContactInfo'>;
type ContactInfoNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ContactInfoScreen: React.FC = () => {
  const route = useRoute<ContactInfoRouteProp>();
  const navigation = useNavigation<ContactInfoNavigationProp>();
  const queryClient = useQueryClient();
  const { userId } = route.params;

  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await usersApi.getUser(userId);
      return response.data as UserProfile;
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      await usersApi.blockUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      Alert.alert('Blocked', 'User has been blocked');
    },
  });

  const handleStartChat = async () => {
    try {
      const response = await conversationsApi.getOrCreatePrivate(userId);
      navigation.navigate('Chat', { conversationId: response.data.id });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleVoiceCall = async () => {
    try {
      const response = await conversationsApi.getOrCreatePrivate(userId);
      navigation.navigate('Call', {
        conversationId: response.data.id,
        type: 'Voice',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start call');
    }
  };

  const handleVideoCall = async () => {
    try {
      const response = await conversationsApi.getOrCreatePrivate(userId);
      navigation.navigate('Call', {
        conversationId: response.data.id,
        type: 'Video',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start call');
    }
  };

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Block ${user?.displayName || user?.fullName}? They won't be able to message or call you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  };

  const formatLastSeen = () => {
    if (!user?.lastSeen) return 'Last seen recently';
    if (user.isOnline) return 'Online';
    return `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar
          uri={user?.profilePictureUrl}
          name={user?.displayName || user?.fullName || ''}
          size={120}
        />
        <Text style={styles.name}>
          {user?.displayName || user?.fullName}
        </Text>
        <Text style={styles.status}>
          {formatLastSeen()}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleStartChat}>
            <View style={styles.actionIcon}>
              <Icon name="message" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleVoiceCall}>
            <View style={styles.actionIcon}>
              <Icon name="phone" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionLabel}>Audio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleVideoCall}>
            <View style={styles.actionIcon}>
              <Icon name="video" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionLabel}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          {user?.about || 'Hey there! I am using IM'}
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="image-multiple" size={24} color={COLORS.textSecondary} />
          <Text style={styles.menuLabel}>Media, links, and docs</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="star" size={24} color={COLORS.textSecondary} />
          <Text style={styles.menuLabel}>Starred messages</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="magnify" size={24} color={COLORS.textSecondary} />
          <Text style={styles.menuLabel}>Search in chat</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="bell-off" size={24} color={COLORS.textSecondary} />
          <Text style={styles.menuLabel}>Mute notifications</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="timer-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.menuLabel}>Disappearing messages</Text>
          <Text style={styles.menuValue}>Off</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.dangerItem}
          onPress={handleBlock}
        >
          <Icon name="block-helper" size={24} color={COLORS.error} />
          <Text style={styles.dangerLabel}>
            Block {user?.displayName || user?.fullName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerItem}>
          <Icon name="thumb-down" size={24} color={COLORS.error} />
          <Text style={styles.dangerLabel}>
            Report {user?.displayName || user?.fullName}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  name: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  status: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: SPACING.xl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  aboutText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginLeft: SPACING.lg,
  },
  menuValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  dangerLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
    marginLeft: SPACING.lg,
  },
});

export default ContactInfoScreen;
