import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Track, ConnectionQuality, Participant, RemoteParticipant, LocalParticipant } from 'livekit-client';
import ParticipantTile from './ParticipantTile';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticipantInfo {
  id: string;
  name: string;
  profilePictureUrl?: string;
  videoTrack?: Track | null;
  audioTrack?: Track | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  connectionQuality?: ConnectionQuality;
}

interface GroupCallGridProps {
  participants: ParticipantInfo[];
  localParticipant?: ParticipantInfo;
  activeSpeakerId?: string;
  layout?: 'grid' | 'spotlight';
}

const GroupCallGrid: React.FC<GroupCallGridProps> = ({
  participants,
  localParticipant,
  activeSpeakerId,
  layout = 'grid',
}) => {
  // Combine local and remote participants
  const allParticipants = useMemo(() => {
    const combined = [...participants];
    if (localParticipant) {
      combined.push(localParticipant);
    }
    return combined;
  }, [participants, localParticipant]);

  const participantCount = allParticipants.length;

  // Determine tile size based on participant count
  const getTileSize = (index: number): 'full' | 'half' | 'third' | 'quarter' => {
    if (layout === 'spotlight' && activeSpeakerId) {
      const speakerIndex = allParticipants.findIndex(p => p.id === activeSpeakerId);
      if (index === speakerIndex) return 'full';
      return 'quarter';
    }

    switch (participantCount) {
      case 1:
        return 'full';
      case 2:
        return 'half';
      case 3:
      case 4:
        return 'half';
      case 5:
      case 6:
        return 'third';
      default:
        return 'quarter';
    }
  };

  // For spotlight layout, separate speaker and others
  if (layout === 'spotlight' && activeSpeakerId && participantCount > 2) {
    const speaker = allParticipants.find(p => p.id === activeSpeakerId);
    const others = allParticipants.filter(p => p.id !== activeSpeakerId);

    return (
      <View style={styles.spotlightContainer}>
        {/* Main speaker */}
        {speaker && (
          <View style={styles.spotlightMain}>
            <ParticipantTile
              participantId={speaker.id}
              participantName={speaker.name}
              profilePictureUrl={speaker.profilePictureUrl}
              videoTrack={speaker.videoTrack}
              audioTrack={speaker.audioTrack}
              isMuted={speaker.isMuted}
              isVideoEnabled={speaker.isVideoEnabled}
              isSpeaking={speaker.isSpeaking}
              isLocal={speaker.isLocal}
              connectionQuality={speaker.connectionQuality}
              tileSize="full"
            />
          </View>
        )}
        {/* Other participants in horizontal strip at bottom */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.spotlightStrip}
          contentContainerStyle={styles.spotlightStripContent}
        >
          {others.map((participant) => (
            <View key={participant.id} style={styles.spotlightThumbnail}>
              <ParticipantTile
                participantId={participant.id}
                participantName={participant.name}
                profilePictureUrl={participant.profilePictureUrl}
                videoTrack={participant.videoTrack}
                audioTrack={participant.audioTrack}
                isMuted={participant.isMuted}
                isVideoEnabled={participant.isVideoEnabled}
                isSpeaking={participant.isSpeaking}
                isLocal={participant.isLocal}
                connectionQuality={participant.connectionQuality}
                tileSize="quarter"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Grid layout for small number of participants
  if (participantCount <= 4) {
    return (
      <View style={styles.gridContainer}>
        {participantCount === 1 && (
          <View style={styles.singleParticipant}>
            <ParticipantTile
              {...allParticipants[0]}
              participantId={allParticipants[0].id}
              participantName={allParticipants[0].name}
              tileSize="full"
            />
          </View>
        )}
        {participantCount === 2 && (
          <View style={styles.twoParticipants}>
            {allParticipants.map((participant) => (
              <View key={participant.id} style={styles.halfTile}>
                <ParticipantTile
                  participantId={participant.id}
                  participantName={participant.name}
                  profilePictureUrl={participant.profilePictureUrl}
                  videoTrack={participant.videoTrack}
                  audioTrack={participant.audioTrack}
                  isMuted={participant.isMuted}
                  isVideoEnabled={participant.isVideoEnabled}
                  isSpeaking={participant.isSpeaking}
                  isLocal={participant.isLocal}
                  connectionQuality={participant.connectionQuality}
                  tileSize="half"
                />
              </View>
            ))}
          </View>
        )}
        {(participantCount === 3 || participantCount === 4) && (
          <View style={styles.gridFour}>
            {allParticipants.map((participant) => (
              <View key={participant.id} style={styles.quarterTile}>
                <ParticipantTile
                  participantId={participant.id}
                  participantName={participant.name}
                  profilePictureUrl={participant.profilePictureUrl}
                  videoTrack={participant.videoTrack}
                  audioTrack={participant.audioTrack}
                  isMuted={participant.isMuted}
                  isVideoEnabled={participant.isVideoEnabled}
                  isSpeaking={participant.isSpeaking}
                  isLocal={participant.isLocal}
                  connectionQuality={participant.connectionQuality}
                  tileSize="half"
                />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Scrollable grid for more than 4 participants
  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.manyParticipantsGrid}>
        {allParticipants.map((participant, index) => (
          <View key={participant.id} style={styles.scrollableTile}>
            <ParticipantTile
              participantId={participant.id}
              participantName={participant.name}
              profilePictureUrl={participant.profilePictureUrl}
              videoTrack={participant.videoTrack}
              audioTrack={participant.audioTrack}
              isMuted={participant.isMuted}
              isVideoEnabled={participant.isVideoEnabled}
              isSpeaking={participant.isSpeaking}
              isLocal={participant.isLocal}
              connectionQuality={participant.connectionQuality}
              tileSize={participantCount <= 6 ? 'third' : 'quarter'}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    padding: 4,
  },
  singleParticipant: {
    flex: 1,
  },
  twoParticipants: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
  },
  halfTile: {
    flex: 1,
  },
  gridFour: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'stretch',
  },
  quarterTile: {
    width: '49%',
    aspectRatio: 3 / 4,
    marginBottom: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  manyParticipantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    padding: 4,
  },
  scrollableTile: {
    marginBottom: 8,
  },
  spotlightContainer: {
    flex: 1,
  },
  spotlightMain: {
    flex: 1,
    margin: 4,
  },
  spotlightStrip: {
    height: 120,
    minHeight: 120,
    maxHeight: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  spotlightStripContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  spotlightThumbnail: {
    width: 90,
    height: 110,
    marginHorizontal: 4,
  },
});

export default GroupCallGrid;
