import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import LinearGradient from 'react-native-linear-gradient';
import Avatar from '../../components/Avatar';
import { callsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Call } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type CallsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CallsScreen: React.FC = () => {
  const navigation = useNavigation<CallsScreenNavigationProp>();
  const { userId } = useAuthStore();

  const { data: calls, isLoading, refetch } = useQuery({
    queryKey: ['callHistory'],
    queryFn: async () => {
      const response = await callsApi.getHistory();
      return response.data as Call[];
    },
  });

  const formatCallTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'dd/MM/yyyy');
  };

  const getCallInfo = (call: Call): { icon: string; color: string; label: string } => {
    const isOutgoing = call.initiatorId === userId;
    const isMissed = call.status === 'Missed' || call.status === 'Declined';

    if (isMissed) {
      return { icon: 'phone-missed', color: COLORS.error, label: 'Missed' };
    }
    if (isOutgoing) {
      return { icon: 'phone-outgoing', color: COLORS.secondary, label: 'Outgoing' };
    }
    return { icon: 'phone-incoming', color: COLORS.primary, label: 'Incoming' };
  };

  const getOtherParticipant = (call: Call) => {
    if (call.initiatorId === userId) {
      return call.participants.find((p) => p.userId !== userId);
    }
    return call.participants.find((p) => p.userId === call.initiatorId);
  };

  const handleCallPress = (call: Call) => {
    const otherParticipant = getOtherParticipant(call);
    if (otherParticipant) {
      navigation.navigate('Call', {
        conversationId: call.conversationId,
        type: call.type,
      });
    }
  };

  const renderCallItem = ({ item }: { item: Call }) => {
    const otherParticipant = getOtherParticipant(item);
    const callInfo = getCallInfo(item);
    const duration = item.duration
      ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}`
      : null;

    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => handleCallPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar
            uri={otherParticipant?.profilePictureUrl}
            name={otherParticipant?.displayName || ''}
            size={52}
          />
          <View style={[styles.callTypeBadge, { backgroundColor: callInfo.color + '20' }]}>
            <Icon
              name={item.type === 'Video' ? 'video' : 'phone'}
              size={12}
              color={callInfo.color}
            />
          </View>
        </View>

        <View style={styles.callInfo}>
          <Text style={styles.callName}>
            {otherParticipant?.displayName || 'Unknown'}
          </Text>
          <View style={styles.callMeta}>
            <Icon name={callInfo.icon} size={14} color={callInfo.color} />
            <Text style={[styles.callLabel, { color: callInfo.color }]}>
              {callInfo.label}
            </Text>
            {duration && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.callDuration}>{duration}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.callRight}>
          <Text style={styles.callTime}>{formatCallTime(item.startedAt)}</Text>
          <TouchableOpacity
            style={styles.callbackButton}
            onPress={() => handleCallPress(item)}
            activeOpacity={0.7}
          >
            <Icon
              name={item.type === 'Video' ? 'video-outline' : 'phone-outline'}
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="phone-clock" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No call history</Text>
      <Text style={styles.emptySubtitle}>
        Your voice and video call history will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <FlatList
        data={calls}
        renderItem={renderCallItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={!calls?.length ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <LinearGradient
          colors={[COLORS.secondary, COLORS.primary]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="phone-plus" size={26} color={COLORS.textLight} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  listContent: {
    paddingBottom: 100,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  callTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  callInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  callName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callLabel: {
    fontSize: FONTS.sizes.sm,
    marginLeft: 4,
  },
  dot: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  callDuration: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  callRight: {
    alignItems: 'flex-end',
  },
  callTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  callbackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 84,
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
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallsScreen;
