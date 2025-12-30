import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { statusApi, filesApi } from '../../services/api';
import { FONTS, SPACING } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BACKGROUND_COLORS = [
  '#128C7E', // Teal (WhatsApp primary)
  '#25D366', // Green
  '#075E54', // Dark Teal
  '#34B7F1', // Blue
  '#6C5CE7', // Purple
  '#FD79A8', // Pink
  '#E17055', // Orange
  '#00B894', // Mint
  '#FDCB6E', // Yellow
  '#2D3436', // Dark Gray
];

const CreateStatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl: string | undefined;

      if (mediaUri) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: mediaUri,
          type: 'image/jpeg',
          name: 'status.jpg',
        } as any);

        const uploadResponse = await filesApi.upload(formData);
        mediaUrl = uploadResponse.data.url;
        setIsUploading(false);
      }

      await statusApi.create({
        textContent: mode === 'text' ? textContent : undefined,
        mediaUrl,
        mediaType: mediaUrl ? 'Image' : undefined,
        backgroundColor: mode === 'text' ? backgroundColor : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStatuses'] });
      queryClient.invalidateQueries({ queryKey: ['contactStatuses'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create status');
    },
  });

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.assets && result.assets[0]) {
        setMediaUri(result.assets[0].uri || null);
        setMode('media');
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.assets && result.assets[0]) {
        setMediaUri(result.assets[0].uri || null);
        setMode('media');
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const handlePost = () => {
    if (mode === 'text' && !textContent.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }
    if (mode === 'media' && !mediaUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }
    createMutation.mutate();
  };

  const renderTextMode = () => (
    <View style={[styles.textContainer, { backgroundColor }]}>
      <TextInput
        style={styles.textInput}
        value={textContent}
        onChangeText={setTextContent}
        placeholder="Type a status..."
        placeholderTextColor="rgba(255, 255, 255, 0.6)"
        multiline
        maxLength={500}
        autoFocus
      />

      <View style={styles.colorPicker}>
        {BACKGROUND_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              backgroundColor === color && styles.colorOptionSelected,
            ]}
            onPress={() => setBackgroundColor(color)}
          />
        ))}
      </View>
    </View>
  );

  const renderMediaMode = () => (
    <View style={styles.mediaContainer}>
      {mediaUri ? (
        <Image source={{ uri: mediaUri }} style={styles.mediaImage} resizeMode="contain" />
      ) : (
        <View style={styles.mediaPlaceholder}>
          <Icon name="image" size={80} color={colors.textMuted} />
          <Text style={styles.mediaPlaceholderText}>Select an image</Text>
        </View>
      )}
    </View>
  );

  const isPending = createMutation.isPending || isUploading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          disabled={isPending}
        >
          <Icon name="close" size={24} color={colors.textInverse} />
        </TouchableOpacity>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => {
              setMode('text');
              setMediaUri(null);
            }}
          >
            <Icon
              name="format-text"
              size={24}
              color={mode === 'text' ? colors.textInverse : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'media' && styles.modeButtonActive]}
            onPress={() => setMode('media')}
          >
            <Icon
              name="image"
              size={24}
              color={mode === 'media' ? colors.textInverse : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'text' ? renderTextMode() : renderMediaMode()}

      <View style={styles.footer}>
        {mode === 'media' && (
          <View style={styles.mediaActions}>
            <TouchableOpacity style={styles.mediaActionButton} onPress={handleTakePhoto}>
              <Icon name="camera" size={28} color={colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaActionButton} onPress={handlePickImage}>
              <Icon name="image-multiple" size={28} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.postButton, isPending && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Icon name="send" size={20} color={colors.textInverse} />
              <Text style={styles.postButtonText}>Post</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
    paddingHorizontal: SPACING.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 4,
  },
  modeButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 16,
  },
  modeButtonActive: {
    backgroundColor: colors.secondary,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  textInput: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: colors.textInverse,
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH - SPACING.xl * 2,
  },
  colorPicker: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    transform: [{ translateY: -100 }],
    alignItems: 'center',
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.textInverse,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  mediaPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPlaceholderText: {
    fontSize: FONTS.sizes.lg,
    color: colors.textMuted,
    marginTop: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mediaActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  mediaActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  postButtonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textInverse,
    marginLeft: SPACING.xs,
  },
});

export default CreateStatusScreen;
