import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeToReply: () => void;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 60;

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onSwipeToReply,
  enabled = true,
}) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);

  const triggerReply = useCallback(() => {
    onSwipeToReply();
  }, [onSwipeToReply]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      // Only allow left swipe (negative x)
      if (event.translationX < 0) {
        // Limit the swipe distance with resistance
        const resistance = 0.5;
        translateX.value = Math.max(event.translationX * resistance, -80);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => {
    const opacity = Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1);
    const scale = 0.5 + opacity * 0.5;
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Reply icon that appears on swipe */}
      <Animated.View style={[styles.replyIconContainer, replyIconStyle]}>
        <View style={[styles.replyIconCircle, { backgroundColor: colors.primary }]}>
          <Icon name="reply" size={18} color="#FFFFFF" />
        </View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  replyIconContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  replyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SwipeableMessage;
