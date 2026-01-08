import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
import { getAbsoluteUrl } from '../utils/mediaUtils';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 50,
  showOnline = false,
  isOnline = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Convert relative URLs to absolute URLs
  const imageUri = useMemo(() => {
    const absoluteUrl = getAbsoluteUrl(uri);
    if (uri) {
      console.log('[Avatar] Converting URI:', uri, '-> Absolute URL:', absoluteUrl);
    }
    return absoluteUrl;
  }, [uri]);

  // Reset error state when URI changes
  useEffect(() => {
    setImageError(false);
  }, [uri]);

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

  const fontSize = size * 0.4;
  const onlineIndicatorSize = size * 0.28;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUri && !imageError ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          onLoad={() => {
            console.log('[Avatar] Image loaded successfully:', imageUri);
          }}
          onError={(e) => {
            console.log('[Avatar] Image load error for URI:', imageUri, 'Error:', e.nativeEvent?.error);
            setImageError(true);
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getBackgroundColor(name),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: onlineIndicatorSize,
              height: onlineIndicatorSize,
              borderRadius: onlineIndicatorSize / 2,
              backgroundColor: isOnline ? COLORS.online : COLORS.offline,
              borderWidth: size * 0.04,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: COLORS.divider,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: COLORS.surface,
  },
});

export default Avatar;
