import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { COLORS, FONTS, SPACING } from '../utils/theme';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onRecordingCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onRecordingCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const recordPath = useRef<string>('');

  useEffect(() => {
    if (isRecording && !isLocked) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
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
  }, [isRecording, isLocked]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;

        // Slide left to cancel
        if (dx < -50) {
          setSlideOffset(dx);
          slideAnim.setValue(dx);
        }

        // Slide up to lock
        if (dy < -80 && !isLocked) {
          setIsLocked(true);
          Vibration.vibrate(50);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (slideOffset < -100) {
          // Cancelled
          cancelRecording();
        } else if (!isLocked) {
          // Send
          stopRecording();
        }
        setSlideOffset(0);
        slideAnim.setValue(0);
      },
    })
  ).current;

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      Vibration.vibrate(50);

      const path = await audioRecorderPlayer.startRecorder();
      recordPath.current = path;

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordingDuration(e.currentPosition);
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setIsRecording(false);
      setIsLocked(false);

      if (result && recordingDuration > 1000) {
        onRecordingComplete(result, recordingDuration);
      }
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const cancelRecording = async () => {
    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setIsRecording(false);
      setIsLocked(false);
      setRecordingDuration(0);
      onRecordingCancel();
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  if (!isRecording) {
    return (
      <View {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.micButton}>
          <Icon name="microphone" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      {isLocked ? (
        // Locked recording UI
        <View style={styles.lockedContainer}>
          <View style={styles.recordingInfo}>
            <Animated.View
              style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]}
            />
            <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
          </View>

          <View style={styles.lockedActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelRecording}
            >
              <Icon name="delete" size={24} color={COLORS.error} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={stopRecording}
            >
              <Icon name="send" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Sliding recording UI
        <Animated.View
          style={[
            styles.slidingContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.slideHint}>
            <Icon name="chevron-left" size={20} color={COLORS.textSecondary} />
            <Text style={styles.slideText}>Slide to cancel</Text>
          </View>

          <View style={styles.recordingInfo}>
            <Animated.View
              style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]}
            />
            <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
          </View>

          <View style={styles.lockHint}>
            <Icon name="lock" size={16} color={COLORS.textSecondary} />
          </View>

          <Animated.View
            style={[styles.micButtonRecording, { transform: [{ scale: pulseAnim }] }]}
          >
            <Icon name="microphone" size={28} color={COLORS.textLight} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  micButton: {
    padding: SPACING.sm,
  },
  recordingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
  },
  slidingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  slideHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.error,
    marginRight: SPACING.sm,
  },
  duration: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '500',
  },
  lockHint: {
    padding: SPACING.sm,
  },
  micButtonRecording: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  cancelButton: {
    padding: SPACING.sm,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VoiceRecorder;
