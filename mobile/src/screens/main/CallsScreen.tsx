import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import Avatar from '../../components/Avatar';
import { callsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Call } from '../../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type CallsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'missed';

const CallsScreen: React.FC = () => {
  const navigation = useNavigation<CallsScreenNavigationProp>();
  const { userId } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: calls, isLoading, refetch } = useQuery({
    queryKey: ['callHistory'],
    queryFn: async () => {
      const response = await callsApi.getHistory();
      return response.data as Call[];
    },
  });

  // Filtered calls
  const filteredCalls = React.useMemo(() => {
    if (!calls) return [];
    if (activeFilter === 'missed') {
      return calls.filter((c) => c.status === 'Missed' || c.status === 'Declined');
    }
    return calls;
  }, [calls, activeFilter]);

  const formatCallTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'dd/MM/yy');
  };

  const getCallInfo = (call: Call): { icon: string; color: string; label: string } => {
    const isOutgoing = call.initiatorId === userId;
    const isMissed = call.status === 'Missed' || call.status === 'Declined';

    if (isMissed) {
      return { icon: 'phone-missed', color: COLORS.error, label: 'Missed' };
    }
    if (isOutgoing) {
      return { icon: 'phone-outgoing', color: COLORS.textSecondary, label: 'outgoing' };
    }
    return { icon: 'phone-incoming', color: COLORS.primary, label: 'incoming' };
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

  const handleNewCall = () => {
    navigation.navigate('NewChat');
  };

  const renderCallItem = ({ item }: { item: Call }) => {
    const otherParticipant = getOtherParticipant(item);
    const callInfo = getCallInfo(item);
    const isMissed = item.status === 'Missed' || item.status === 'Declined';
    const isVideo = item.type === 'Video';

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
            size={50}
          />
          {isVideo && (
            <View style={styles.videoIndicator}>
              <Icon name="video" size={10} color={COLORS.textLight} />
            </View>
          )}
        </View>

        <View style={styles.callInfo}>
          <Text style={[styles.callName, isMissed && styles.callNameMissed]}>
            {otherParticipant?.displayName || 'Unknown'}
          </Text>
          <View style={styles.callMeta}>
            <Icon name="phone" size={12} color={callInfo.color} />
            <Text style={[styles.callLabel, isMissed && styles.callLabelMissed]}>
              {callInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.callRight}>
          <Text style={styles.callTime}>{formatCallTime(item.startedAt)}</Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {/* Show call info */}}
            activeOpacity={0.7}
          >
            <Icon name="information-outline" size={22} color={COLORS.textSecondary} />
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity style={styles.newCallButton} onPress={handleNewCall}>
          <Icon name="phone-plus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <Text style={styles.doneText}>Done</Text>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'missed' && styles.filterTabActive]}
            onPress={() => setActiveFilter('missed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeFilter === 'missed' && styles.filterTabTextActive]}>
              Missed
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.newCallIconButton} onPress={handleNewCall}>
          <Icon name="phone-plus-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCalls}
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
        contentContainerStyle={!filteredCalls?.length ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  newCallButton: {
    padding: SPACING.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  doneText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    width: 50,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: 2,
  },
  filterTab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  newCallIconButton: {
    padding: SPACING.xs,
    width: 50,
    alignItems: 'flex-end',
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
  videoIndicator: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
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
    marginBottom: 2,
  },
  callNameMissed: {
    color: COLORS.error,
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  callLabelMissed: {
    color: COLORS.error,
  },
  callRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  callTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  infoButton: {
    padding: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
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
});

export default CallsScreen;
