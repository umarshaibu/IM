import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';

interface OnlineIndicatorProps {
  isOnline?: boolean;
  lastSeen?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline = false,
  lastSeen,
  size = 'medium',
  showText = false,
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 8;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  const getBorderWidth = () => {
    switch (size) {
      case 'small':
        return 1.5;
      case 'large':
        return 3;
      default:
        return 2;
    }
  };

  const formatLastSeen = (dateString?: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const dotSize = getSize();
  const borderWidth = getBorderWidth();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            borderWidth,
            backgroundColor: isOnline ? COLORS.online : COLORS.offline,
          },
        ]}
      />
      {showText && (
        <Text style={styles.text}>
          {isOnline ? 'Online' : `Last seen ${formatLastSeen(lastSeen)}`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderColor: COLORS.surface,
  },
  text: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});

export default OnlineIndicator;
