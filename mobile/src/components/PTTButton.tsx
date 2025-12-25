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
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import * as signalr from '../services/signalr';
import { filesApi } from '../services/api';

interface PTTButtonProps {
  conversationId: string;
  onPTTStart?: () => void;
  onPTTEnd?: (mediaUrl: string | null, duration: number) => void;
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

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const recordPath = useRef<string>('');
  const startTime = useRef<number>(0);

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

      return () => pulse.stop();
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

      // Notify server that PTT has started
      await signalr.startPTT(conversationId);

      // Start recording
      const path = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/ptt_${Date.now()}.m4a`,
        android: `${RNFS.CachesDirectoryPath}/ptt_${Date.now()}.mp4`,
      })!;

      await audioRecorderPlayer.startRecorder(path);
      recordPath.current = path;

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordingDuration(e.currentPosition);
      });

      // Scale up animation for button press
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();

      onPTTStart?.();
    } catch (error) {
      console.error('Error starting PTT recording:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      const duration = Date.now() - startTime.current;
      setIsRecording(false);
      setRecordingDuration(0);

      // Scale back animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Upload the recording if it's long enough (at least 500ms)
      if (duration >= 500 && recordPath.current) {
        try {
          // Upload the audio file
          const uploadResult = await filesApi.uploadFile(recordPath.current, 'audio/mp4');
          const mediaUrl = uploadResult.data?.fileUrl || null;

          // Notify server that PTT has ended with the media URL
          await signalr.endPTT(conversationId, mediaUrl, duration);

          onPTTEnd?.(mediaUrl, duration);
        } catch (uploadError) {
          console.error('Error uploading PTT recording:', uploadError);
          // Still notify server that PTT ended, but without media URL
          await signalr.endPTT(conversationId, null, duration);
          onPTTEnd?.(null, duration);
        }

        // Clean up the temporary file
        try {
          await RNFS.unlink(recordPath.current);
        } catch {
          // Ignore cleanup errors
        }
      } else {
        // Too short, treat as cancelled
        await signalr.cancelPTT(conversationId);
        onPTTCancel?.();
      }

      recordPath.current = '';
    } catch (error) {
      console.error('Error stopping PTT recording:', error);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (!isRecording) return;

    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setIsRecording(false);
      setRecordingDuration(0);
      setSlideOffset(0);
      slideAnim.setValue(0);

      // Scale back animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Notify server that PTT was cancelled
      await signalr.cancelPTT(conversationId);

      // Clean up the temporary file
      if (recordPath.current) {
        try {
          await RNFS.unlink(recordPath.current);
        } catch {
          // Ignore cleanup errors
        }
        recordPath.current = '';
      }

      onPTTCancel?.();
      Vibration.vibrate(50);
    } catch (error) {
      console.error('Error cancelling PTT recording:', error);
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
