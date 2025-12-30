import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import Avatar from '../../components/Avatar';
import { statusApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { UserStatuses, Status } from '../../types';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

type StatusScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StatusScreen: React.FC = () => {
  const navigation = useNavigation<StatusScreenNavigationProp>();
  const { user } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: myStatuses, refetch: refetchMy } = useQuery({
    queryKey: ['myStatuses'],
    queryFn: async () => {
      const response = await statusApi.getMyStatuses();
      return response.data as Status[];
    },
  });

  const { data: contactStatuses, isLoading, refetch } = useQuery({
    queryKey: ['contactStatuses'],
    queryFn: async () => {
      const response = await statusApi.getContactStatuses();
      return response.data as UserStatuses[];
    },
  });

  const handleRefresh = () => {
    refetch();
    refetchMy();
  };

  const renderMyStatus = () => (
    <TouchableOpacity
      style={styles.myStatusContainer}
      onPress={() => {
        if (myStatuses && myStatuses.length > 0) {
          navigation.navigate('StatusViewer', { userId: user?.id || '' });
        } else {
          navigation.navigate('CreateStatus');
        }
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.primary + '15', colors.secondary + '15']}
        style={styles.myStatusGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.myStatusAvatarWrapper}>
          <View style={[
            styles.statusRingLarge,
            myStatuses && myStatuses.length > 0 && styles.statusRingActive
          ]}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={user?.displayName || user?.fullName || ''}
              size={64}
            />
          </View>
          {(!myStatuses || myStatuses.length === 0) && (
            <View style={styles.addStatusBadge}>
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.addBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="plus" size={14} color={colors.textInverse} />
              </LinearGradient>
            </View>
          )}
        </View>
        <View style={styles.myStatusInfo}>
          <Text style={styles.myStatusTitle}>My Status</Text>
          <Text style={styles.myStatusSubtitle}>
            {myStatuses && myStatuses.length > 0
              ? `${myStatuses.length} status update${myStatuses.length > 1 ? 's' : ''}`
              : 'Tap to add status update'}
          </Text>
        </View>
        <View style={styles.myStatusAction}>
          <Icon
            name={myStatuses && myStatuses.length > 0 ? 'eye-outline' : 'plus-circle-outline'}
            size={24}
            color={colors.primary}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStatusItem = ({ item }: { item: UserStatuses }) => (
    <TouchableOpacity
      style={styles.statusItem}
      onPress={() => navigation.navigate('StatusViewer', { userId: item.user.id })}
      activeOpacity={0.7}
    >
      <View style={[
        styles.statusRing,
        item.hasUnviewed ? styles.statusRingUnviewed : styles.statusRingViewed
      ]}>
        <Avatar
          uri={item.user.profilePictureUrl}
          name={item.user.displayName || item.user.fullName || ''}
          size={52}
        />
      </View>
      <View style={styles.statusInfo}>
        <Text style={styles.statusName}>
          {item.user.displayName || item.user.fullName}
        </Text>
        <View style={styles.statusMeta}>
          <Icon
            name={item.hasUnviewed ? 'circle' : 'check-circle'}
            size={12}
            color={item.hasUnviewed ? colors.secondary : colors.textMuted}
          />
          <Text style={[
            styles.statusTime,
            item.hasUnviewed && styles.statusTimeNew
          ]}>
            {item.statuses.length > 0
              ? formatDistanceToNow(new Date(item.statuses[0].createdAt), { addSuffix: true })
              : ''}
          </Text>
        </View>
      </View>
      <View style={styles.statusCount}>
        <Text style={styles.statusCountText}>
          {item.statuses.length}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {renderMyStatus()}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Recent updates</Text>
        </View>
        {contactStatuses && contactStatuses.length > 0 && (
          <Text style={styles.sectionCount}>
            {contactStatuses.filter(s => s.hasUnviewed).length} new
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="camera-burst" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No status updates</Text>
      <Text style={styles.emptySubtitle}>
        Status updates from your contacts will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      <FlatList
        data={contactStatuses}
        renderItem={renderStatusItem}
        keyExtractor={(item) => item.user.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyList : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          !contactStatuses?.length ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateStatus')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[colors.secondary, colors.primary]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="camera" size={26} color={colors.textInverse} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fabSecondary}
        onPress={() => navigation.navigate('CreateStatus')}
        activeOpacity={0.9}
      >
        <Icon name="pencil" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: SPACING.sm,
  },
  myStatusContainer: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  myStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  myStatusAvatarWrapper: {
    position: 'relative',
  },
  statusRingLarge: {
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.divider,
    padding: 2,
  },
  statusRingActive: {
    borderColor: colors.secondary,
  },
  addStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  addBadgeGradient: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStatusInfo: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  myStatusTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  myStatusSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  myStatusAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: colors.secondary,
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  statusRing: {
    borderRadius: 30,
    borderWidth: 2.5,
    padding: 2,
  },
  statusRingUnviewed: {
    borderColor: colors.secondary,
  },
  statusRingViewed: {
    borderColor: colors.divider,
  },
  statusInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  statusName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTime: {
    fontSize: FONTS.sizes.sm,
    color: colors.textMuted,
    marginLeft: 4,
  },
  statusTimeNew: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCountText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 84,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
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
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    borderRadius: 30,
    shadowColor: colors.primary,
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
  fabSecondary: {
    position: 'absolute',
    right: SPACING.lg + 4,
    bottom: SPACING.xl + 76,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default StatusScreen;
