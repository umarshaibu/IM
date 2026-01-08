import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../utils/theme';
import { getAbsoluteUrl } from '../utils/mediaUtils';

interface Participant {
  profilePictureUrl?: string;
  displayName?: string;
}

interface GroupAvatarProps {
  participants: Participant[];
  size?: number;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({
  participants,
  size = 50,
}) => {
  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const displayParticipants = participants.slice(0, 4);
  const count = displayParticipants.length;

  // Calculate sizes for mini avatars
  const miniSize = count <= 2 ? size * 0.6 : size * 0.48;
  const fontSize = miniSize * 0.4;

  const renderMiniAvatar = (participant: Participant, index: number) => {
    const name = participant.displayName || 'U';
    const uri = getAbsoluteUrl(participant.profilePictureUrl);

    // Position based on count and index
    let position: { top?: number; bottom?: number; left?: number; right?: number } = {};

    if (count === 1) {
      // Center single avatar
      position = { top: (size - miniSize) / 2, left: (size - miniSize) / 2 };
    } else if (count === 2) {
      // Two avatars diagonally
      if (index === 0) {
        position = { top: 0, left: 0 };
      } else {
        position = { bottom: 0, right: 0 };
      }
    } else if (count === 3) {
      // Three avatars in triangle
      if (index === 0) {
        position = { top: 0, left: (size - miniSize) / 2 };
      } else if (index === 1) {
        position = { bottom: 0, left: 0 };
      } else {
        position = { bottom: 0, right: 0 };
      }
    } else {
      // Four avatars in grid
      if (index === 0) {
        position = { top: 0, left: 0 };
      } else if (index === 1) {
        position = { top: 0, right: 0 };
      } else if (index === 2) {
        position = { bottom: 0, left: 0 };
      } else {
        position = { bottom: 0, right: 0 };
      }
    }

    return (
      <View
        key={index}
        style={[
          styles.miniAvatarContainer,
          {
            width: miniSize,
            height: miniSize,
            borderRadius: miniSize / 2,
            ...position,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.miniImage,
              {
                width: miniSize - 2,
                height: miniSize - 2,
                borderRadius: (miniSize - 2) / 2,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.miniPlaceholder,
              {
                width: miniSize - 2,
                height: miniSize - 2,
                borderRadius: (miniSize - 2) / 2,
                backgroundColor: getBackgroundColor(name),
              },
            ]}
          >
            <Text style={[styles.miniInitials, { fontSize }]}>
              {getInitials(name)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {displayParticipants.map((participant, index) =>
        renderMiniAvatar(participant, index)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  miniAvatarContainer: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.surface,
  },
  miniImage: {
    backgroundColor: COLORS.divider,
  },
  miniPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniInitials: {
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
});

export default GroupAvatar;
