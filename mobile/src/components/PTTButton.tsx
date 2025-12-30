import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { pttStreamService } from '../services/PTTStreamService';

interface PTTButtonProps {
  conversationId: string;
  onPTTStart?: () => void;
  onPTTEnd?: (duration: number) => void;
  onPTTCancel?: () => void;
  disabled?: boolean;
}

const PTTButton: React.FC<PTTButtonProps> = ({
  conversationId,
  onPTTStart,
  onPTTEnd,
  onPTTCancel,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const startTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Initialize PTT stream service on mount
  useEffect(() => {
    if (!isInitialized.current) {
      pttStreamService.init();
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Pulse animation for the recording indicator
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTime.current);
      }, 100);

      return () => {
        pulse.stop();
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
        }
      };
    }
  }, [isRecording, pulseAnim]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (disabled) return;

    try {
      setIsRecording(true);
      startTime.current = Date.now();
      Vibration.vibrate(50);

      // Start streaming audio
      const success = await pttStreamService.startStreaming(conversationId);

      if (!success) {
        setIsRecording(false);
        Alert.alert('Error', 'Failed to start PTT. Please try again.');
        return;
      }

      // Scale up animation for button press
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();

      onPTTStart?.();
    } catch (error) {
      console.error('Error starting PTT:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const duration = Date.now() - startTime.current;

      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);

      // Scale back animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Stop streaming if duration is long enough (at least 500ms)
      if (duration >= 500) {
        const result = await pttStreamService.stopStreaming();
        onPTTEnd?.(result.duration);
      } else {
        // Too short, treat as cancelled
        await pttStreamService.cancelStreaming();
        onPTTCancel?.();
      }
    } catch (error) {
      console.error('Error stopping PTT:', error);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (!isRecording) return;

    try {
      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);
      setSlideOffset(0);
      slideAnim.setValue(0);

      // Scale back animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Cancel streaming
      await pttStreamService.cancelStreaming();

      onPTTCancel?.();
      Vibration.vibrate(50);
    } catch (error) {
      console.error('Error cancelling PTT:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;

        // Slide left to cancel
        if (dx < 0) {
          setSlideOffset(dx);
          slideAnim.setValue(dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (slideOffset < -80) {
          // Cancelled by sliding
          cancelRecording();
        } else {
          // Release to send
          stopRecording();
        }
        setSlideOffset(0);
        slideAnim.setValue(0);
      },
      onPanResponderTerminate: () => {
        if (isRecording) {
          cancelRecording();
        }
        setSlideOffset(0);
        slideAnim.setValue(0);
      },
    })
  ).current;

  const buttonOpacity = slideOffset < -80 ? 0.5 : 1;

  if (!isRecording) {
    return (
      <View {...panResponder.panHandlers} style={styles.buttonContainer}>
        <Animated.View
          style={[
            styles.pttButton,
            {
              backgroundColor: colors.secondary,
              transform: [{ scale: scaleAnim }],
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Icon name="radio-handheld" size={24} color="#FFFFFF" />
        </Animated.View>
        <Text style={[styles.holdLabel, { color: colors.textSecondary }]}>
          Hold to talk
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.recordingOverlay, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.recordingContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Slide to cancel hint */}
        <View style={styles.slideHint}>
          <Icon name="chevron-left" size={20} color={colors.textSecondary} />
          <Text style={[styles.slideText, { color: colors.textSecondary }]}>
            Slide to cancel
          </Text>
        </View>

        {/* Recording indicator */}
        <View style={styles.recordingInfo}>
          <Animated.View
            style={[
              styles.recordingDot,
              { backgroundColor: colors.error, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={[styles.duration, { color: colors.text }]}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        {/* PTT Button during recording */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.pttButtonRecording,
            {
              backgroundColor: colors.secondary,
              transform: [{ scale: scaleAnim }],
              opacity: buttonOpacity,
            },
          ]}
        >
          <Icon name="radio-handheld" size={28} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>

      {/* Live indicator */}
      <View style={[styles.liveIndicator, { backgroundColor: colors.error }]}>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pttButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  holdLabel: {
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  recordingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slideHint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slideText: {
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.xs,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  duration: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pttButtonRecording: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  liveIndicator: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
});

export default PTTButton;
