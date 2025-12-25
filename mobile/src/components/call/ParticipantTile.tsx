import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VideoView } from '@livekit/react-native';
import { Track, ConnectionQuality } from 'livekit-client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from '../Avatar';
import { FONTS, SPACING } from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ParticipantTileProps {
  participantId: string;
  participantName: string;
  profilePictureUrl?: string;
  videoTrack?: Track | null;
  audioTrack?: Track | null;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
  connectionQuality?: ConnectionQuality;
  tileSize: 'full' | 'half' | 'third' | 'quarter';
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participantId,
  participantName,
  profilePictureUrl,
  videoTrack,
  audioTrack,
  isMuted = false,
  isVideoEnabled = true,
  isSpeaking = false,
  isLocal = false,
  connectionQuality,
  tileSize,
}) => {
  const getTileStyle = () => {
    switch (tileSize) {
      case 'full':
        return styles.tileFull;
      case 'half':
        return styles.tileHalf;
      case 'third':
        return styles.tileThird;
      case 'quarter':
        return styles.tileQuarter;
      default:
        return styles.tileQuarter;
    }
  };

  const getAvatarSize = () => {
    switch (tileSize) {
      case 'full':
        return 120;
      case 'half':
        return 80;
      case 'third':
        return 60;
      case 'quarter':
        return 50;
      default:
        return 50;
    }
  };

  const getQualityIcon = () => {
    if (!connectionQuality) return null;
    switch (connectionQuality) {
      case ConnectionQuality.Excellent:
        return { icon: 'signal-cellular-3', color: '#4CAF50' };
      case ConnectionQuality.Good:
        return { icon: 'signal-cellular-2', color: '#8BC34A' };
      case ConnectionQuality.Poor:
        return { icon: 'signal-cellular-1', color: '#FF9800' };
      case ConnectionQuality.Lost:
        return { icon: 'signal-cellular-outline', color: '#F44336' };
      default:
        return null;
    }
  };

  const qualityInfo = getQualityIcon();

  return (
    <View style={[styles.tile, getTileStyle(), isSpeaking && styles.tileSpeaking]}>
      {videoTrack && isVideoEnabled ? (
        <VideoView
          style={styles.video}
          videoTrack={videoTrack as any}
          objectFit="cover"
          mirror={isLocal}
        />
      ) : (
        <View style={styles.avatarContainer}>
          <Avatar
            uri={profilePictureUrl}
            name={participantName}
            size={getAvatarSize()}
          />
        </View>
      )}

      {/* Participant info overlay */}
      <View style={styles.infoOverlay}>
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {isLocal ? 'You' : participantName}
          </Text>
          {isMuted && (
            <View style={styles.mutedBadge}>
              <Icon name="microphone-off" size={12} color="#FF5252" />
            </View>
          )}
        </View>
      </View>

      {/* Connection quality indicator */}
      {qualityInfo && !isLocal && (
        <View style={styles.qualityBadge}>
          <Icon name={qualityInfo.icon} size={14} color={qualityInfo.color} />
        </View>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <View style={styles.speakingIndicator}>
          <Icon name="volume-high" size={16} color="#4CAF50" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 4,
  },
  tileFull: {
    flex: 1,
    aspectRatio: undefined,
  },
  tileHalf: {
    width: (SCREEN_WIDTH - 24) / 2,
    aspectRatio: 3 / 4,
  },
  tileThird: {
    width: (SCREEN_WIDTH - 32) / 3,
    aspectRatio: 3 / 4,
  },
  tileQuarter: {
    width: (SCREEN_WIDTH - 32) / 2,
    aspectRatio: 3 / 4,
  },
  tileSpeaking: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    flex: 1,
  },
  mutedBadge: {
    marginLeft: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 82, 82, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speakingIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

export default ParticipantTile;
