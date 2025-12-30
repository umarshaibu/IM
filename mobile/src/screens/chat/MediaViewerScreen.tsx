import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
  Share,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video, { ResizeMode, OnProgressData, OnLoadData } from 'react-native-video';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { FONTS, SPACING } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type MediaViewerRouteProp = RouteProp<RootStackParamList, 'MediaViewer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MediaViewerScreen: React.FC = () => {
  const route = useRoute<MediaViewerRouteProp>();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { mediaUrl, mediaType, senderName, timestamp } = route.params;

  const [showControls, setShowControls] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
        opacity.setValue(1 - gestureState.dy / SCREEN_HEIGHT);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => navigation.goBack());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: mediaUrl,
        message: Platform.OS === 'android' ? mediaUrl : undefined,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMedia = () => {
    if (mediaType === 'Video') {
      return (
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleControls}
          style={styles.mediaContainer}
        >
          <Video
            source={{ uri: mediaUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            paused={isPaused}
            onProgress={(data: OnProgressData) => setCurrentTime(data.currentTime)}
            onLoad={(data: OnLoadData) => setDuration(data.duration)}
            repeat
          />
          {showControls && (
            <View style={styles.videoControls}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={() => setIsPaused(!isPaused)}
              >
                <Icon
                  name={isPaused ? 'play' : 'pause'}
                  size={48}
                  color={colors.textInverse}
                />
              </TouchableOpacity>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progress,
                    { width: `${(currentTime / duration) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={toggleControls}
        style={styles.mediaContainer}
      >
        <Image
          source={{ uri: mediaUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {showControls && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="star-outline" size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Icon name="share-variant" size={24} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderMedia()}

      {showControls && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButton}>
            <Icon name="download" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton}>
            <Icon name="share" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton}>
            <Icon name="delete" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  senderName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.textInverse,
  },
  timestamp: {
    fontSize: FONTS.sizes.sm,
    color: colors.textInverse,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: SPACING.sm,
  },
  progress: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },
  timeText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textInverse,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  footerButton: {
    padding: SPACING.md,
  },
});

export default MediaViewerScreen;
