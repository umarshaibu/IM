import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useTheme } from '../context';
import { FONTS, SPACING } from '../utils/theme';

interface TypingIndicatorProps {
  names?: string[];
  isVisible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ names = [], isVisible }) => {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) return;

    const createAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const animation = Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 150),
      createAnimation(dot3, 300),
    ]);

    animation.start();

    return () => {
      animation.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [isVisible, dot1, dot2, dot3]);

  if (!isVisible) return null;

  const getTypingText = () => {
    if (names.length === 0) return 'typing';
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names[0]} and ${names.length - 1} others are typing`;
  };

  const bubbleColor = colors.receivedBubble || colors.surface;
  const dotColor = colors.textSecondary;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <View style={styles.dotsContainer}>
          {[dot1, dot2, dot3].map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: dotColor },
                {
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -4],
                      }),
                    },
                  ],
                  opacity: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>
      {names.length > 0 && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>{getTypingText()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  bubble: {
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: FONTS.sizes.xs,
    marginLeft: SPACING.sm,
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
