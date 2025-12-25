import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { SPACING, BORDER_RADIUS } from '../utils/theme';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionsPopupProps {
  visible: boolean;
  position: { x: number; y: number };
  onReact: (emoji: string) => void;
  onClose: () => void;
  onMoreReactions?: () => void;
}

const AnimatedReaction: React.FC<{
  emoji: string;
  index: number;
  onPress: () => void;
}> = ({ emoji, index, onPress }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 30,
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.reactionButton}
        activeOpacity={0.7}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ReactionsPopup: React.FC<ReactionsPopupProps> = ({
  visible,
  position,
  onReact,
  onClose,
  onMoreReactions,
}) => {
  const { colors, isDark } = useTheme();
  const containerScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      containerScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      containerScale.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
    opacity: containerScale.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            containerStyle,
            {
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              top: Math.max(position.y - 60, 100),
              left: Math.max(Math.min(position.x - 120, 200), 20),
            },
          ]}
        >
          {REACTIONS.map((emoji, index) => (
            <AnimatedReaction
              key={emoji}
              emoji={emoji}
              index={index}
              onPress={() => {
                onReact(emoji);
                onClose();
              }}
            />
          ))}
          {onMoreReactions && (
            <TouchableOpacity
              onPress={() => {
                onMoreReactions();
                onClose();
              }}
              style={styles.moreButton}
              activeOpacity={0.7}
            >
              <View style={[styles.moreCircle, { backgroundColor: colors.divider }]}>
                <Icon name="plus" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  container: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  reactionButton: {
    padding: SPACING.xs,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  moreCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReactionsPopup;
