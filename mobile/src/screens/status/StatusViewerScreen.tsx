import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../../components/Avatar';
import { statusApi, usersApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Status, UserProfile } from '../../types';
import { COLORS, FONTS, SPACING } from '../../utils/theme';

type StatusViewerRouteProp = RouteProp<RootStackParamList, 'StatusViewer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUS_DURATION = 5000; // 5 seconds per status

const StatusViewerScreen: React.FC = () => {
  const route = useRoute<StatusViewerRouteProp>();
  const navigation = useNavigation();
  const { userId: statusUserId } = route.params;
  const { userId: currentUserId } = useAuthStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const isMyStatus = statusUserId === currentUserId;

  const { data: statuses } = useQuery({
    queryKey: ['statuses', statusUserId],
    queryFn: async () => {
      const response = isMyStatus
        ? await statusApi.getMyStatuses()
        : await statusApi.getContactStatuses();

      if (isMyStatus) {
        return response.data as Status[];
      }

      const userStatuses = (response.data as any[]).find(
        (u: any) => u.user.id === statusUserId
      );
      return userStatuses?.statuses as Status[] || [];
    },
  });

  const { data: statusUser } = useQuery({
    queryKey: ['user', statusUserId],
    queryFn: async () => {
      const response = await usersApi.getUser(statusUserId);
      return response.data as UserProfile;
    },
    enabled: !isMyStatus,
  });

  const viewMutation = useMutation({
    mutationFn: async (statusId: string) => {
      await statusApi.view(statusId);
    },
  });

  const currentStatus = statuses?.[currentIndex];
  const user = isMyStatus ? useAuthStore.getState().user : statusUser;

  useEffect(() => {
    if (currentStatus && !isMyStatus) {
      viewMutation.mutate(currentStatus.id);
    }
  }, [currentIndex, currentStatus?.id]);

  useEffect(() => {
    startAnimation();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentIndex, isPaused]);

  const startAnimation = () => {
    if (isPaused || !statuses?.length) return;

    progress.setValue(0);
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: STATUS_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });
  };

  const goToNext = () => {
    if (!statuses?.length) return;

    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePressIn = () => {
    setIsPaused(true);
    if (animationRef.current) {
      animationRef.current.stop();
    }
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleLeftPress = () => {
    goToPrevious();
  };

  const handleRightPress = () => {
    goToNext();
  };

  const renderProgressBars = () => (
    <View style={styles.progressContainer}>
      {statuses?.map((_, index) => (
        <View key={index} style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width:
                  index < currentIndex
                    ? '100%'
                    : index === currentIndex
                    ? progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    : '0%',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );

  const renderStatusContent = () => {
    if (!currentStatus) return null;

    if (currentStatus.mediaUrl) {
      return (
        <Image
          source={{ uri: currentStatus.mediaUrl }}
          style={styles.statusImage}
          resizeMode="contain"
        />
      );
    }

    const backgroundColor = currentStatus.backgroundColor || '#128C7E';

    return (
      <LinearGradient
        colors={[backgroundColor, adjustColor(backgroundColor, -30)]}
        style={styles.textStatusContainer}
      >
        <Text style={styles.statusText}>{currentStatus.textContent}</Text>
      </LinearGradient>
    );
  };

  const adjustColor = (color: string, amount: number): string => {
    const clamp = (num: number) => Math.min(255, Math.max(0, num));
    const hex = color.replace('#', '');
    const r = clamp(parseInt(hex.slice(0, 2), 16) + amount);
    const g = clamp(parseInt(hex.slice(2, 4), 16) + amount);
    const b = clamp(parseInt(hex.slice(4, 6), 16) + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  if (!statuses?.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.noStatusText}>No statuses available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {renderStatusContent()}

      <TouchableOpacity
        style={styles.leftTouchArea}
        onPress={handleLeftPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={styles.rightTouchArea}
        onPress={handleRightPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      />

      <View style={styles.header}>
        {renderProgressBars()}

        <View style={styles.userInfo}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <Avatar
            uri={user?.profilePictureUrl}
            name={user?.displayName || user?.fullName || ''}
            size={40}
          />
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>
              {isMyStatus ? 'My Status' : user?.displayName || user?.fullName}
            </Text>
            <Text style={styles.statusTime}>
              {currentStatus
                ? formatDistanceToNow(new Date(currentStatus.createdAt), {
                    addSuffix: true,
                  })
                : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Icon name="dots-vertical" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {isMyStatus && currentStatus && (
        <View style={styles.viewsContainer}>
          <TouchableOpacity style={styles.viewsButton}>
            <Icon name="eye" size={20} color={COLORS.textLight} />
            <Text style={styles.viewsText}>
              {currentStatus.viewCount || 0} views
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isMyStatus && (
        <View style={styles.replyContainer}>
          <TouchableOpacity style={styles.replyInput}>
            <Text style={styles.replyPlaceholder}>Reply...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton}>
            <Icon name="send" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
    paddingHorizontal: SPACING.sm,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xs,
    gap: 4,
  },
  progressBarBackground: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.textLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  userTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  userName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  statusTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    opacity: 0.8,
  },
  moreButton: {
    padding: SPACING.sm,
  },
  statusImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  textStatusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  statusText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 36,
  },
  leftTouchArea: {
    position: 'absolute',
    left: 0,
    top: 100,
    bottom: 100,
    width: SCREEN_WIDTH / 3,
    zIndex: 5,
  },
  rightTouchArea: {
    position: 'absolute',
    right: 0,
    top: 100,
    bottom: 100,
    width: SCREEN_WIDTH / 3,
    zIndex: 5,
  },
  viewsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  viewsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    marginLeft: SPACING.xs,
  },
  replyContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginRight: SPACING.sm,
  },
  replyPlaceholder: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textLight,
    opacity: 0.7,
  },
  sendButton: {
    padding: SPACING.sm,
  },
  noStatusText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default StatusViewerScreen;
