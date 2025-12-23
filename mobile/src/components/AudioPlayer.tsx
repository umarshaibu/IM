import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { COLORS, FONTS, SPACING } from '../utils/theme';

interface AudioPlayerProps {
  uri: string;
  duration?: number;
  isMine?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri, duration = 0, isMine = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  useEffect(() => {
    const progress = totalDuration > 0 ? currentPosition / totalDuration : 0;
    progressAnim.setValue(progress);
  }, [currentPosition, totalDuration]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioRecorderPlayer.pausePlayer();
        setIsPlaying(false);
      } else {
        if (currentPosition === 0) {
          await audioRecorderPlayer.startPlayer(uri);
          audioRecorderPlayer.addPlayBackListener((e) => {
            setCurrentPosition(e.currentPosition);
            setTotalDuration(e.duration);

            if (e.currentPosition >= e.duration) {
              setIsPlaying(false);
              setCurrentPosition(0);
              audioRecorderPlayer.stopPlayer();
            }
          });
        } else {
          await audioRecorderPlayer.resumePlayer();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const handleSeek = async (position: number) => {
    try {
      await audioRecorderPlayer.seekToPlayer(position);
      setCurrentPosition(position);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const waveformBars = Array.from({ length: 30 }, (_, i) => {
    const height = Math.random() * 0.6 + 0.2;
    return height;
  });

  return (
    <View style={[styles.container, isMine && styles.containerMine]}>
      <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={28}
          color={isMine ? COLORS.primary : COLORS.secondary}
        />
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {waveformBars.map((height, index) => {
            const progress = totalDuration > 0 ? currentPosition / totalDuration : 0;
            const isPlayed = index / waveformBars.length <= progress;

            return (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  { height: `${height * 100}%` },
                  isPlayed && styles.waveformBarPlayed,
                  isMine && isPlayed && styles.waveformBarPlayedMine,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.timeContainer}>
          <Text style={[styles.time, isMine && styles.timeMine]}>
            {formatTime(currentPosition || totalDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.chatBubbleReceived,
    borderRadius: 20,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 200,
    maxWidth: 280,
  },
  containerMine: {
    backgroundColor: COLORS.chatBubbleSent,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  waveformContainer: {
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 2,
  },
  waveformBar: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    minHeight: 4,
  },
  waveformBarPlayed: {
    backgroundColor: COLORS.secondary,
  },
  waveformBarPlayedMine: {
    backgroundColor: COLORS.primary,
  },
  timeContainer: {
    marginTop: SPACING.xs,
  },
  time: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  timeMine: {
    color: COLORS.textSecondary,
  },
});

export default AudioPlayer;
