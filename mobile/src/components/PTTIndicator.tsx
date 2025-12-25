import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { useChatStore } from '../stores/chatStore';

interface PTTIndicatorProps {
  conversationId: string;
}

const PTTIndicator: React.FC<PTTIndicatorProps> = ({ conversationId }) => {
  const { colors } = useTheme();
  const pttSession = useChatStore((state) => state.pttSessions[conversationId]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pttSession) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Pulse animation for the sound waves
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [pttSession, fadeAnim, pulseAnim]);

  if (!pttSession) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon name="volume-high" size={24} color="#FFFFFF" />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.speakingText}>Speaking</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {pttSession.userName}
          </Text>
        </View>

        {/* Sound wave animation */}
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  backgroundColor: '#FFFFFF',
                  opacity: 0.8 - index * 0.1,
                  transform: [
                    {
                      scaleY: pulseAnim.interpolate({
                        inputRange: [1, 1.3],
                        outputRange: [0.5 + index * 0.1, 1 - index * 0.1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  speakingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
});

export default PTTIndicator;
