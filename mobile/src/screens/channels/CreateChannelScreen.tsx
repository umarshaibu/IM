import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { launchImageLibrary } from 'react-native-image-picker';
import { channelsApi, filesApi } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type CreateChannelScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_NAME_LENGTH = 50;
const MAX_SHORT_NAME_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

const CreateChannelScreen: React.FC = () => {
  const navigation = useNavigation<CreateChannelScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const createChannelMutation = useMutation({
    mutationFn: async () => {
      const response = await channelsApi.create({
        name: name.trim(),
        shortName: shortName.trim(),
        description: description.trim() || undefined,
        iconUrl: iconUrl || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      Alert.alert('Success', 'Channel created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to create channel. Please try again.'
      );
    },
  });

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.uri) return;

      setIconUri(asset.uri);
      setIsUploadingIcon(true);

      try {
        const uploadResponse = await filesApi.uploadFile(
          asset.uri,
          asset.type || 'image/jpeg'
        );
        setIconUrl(uploadResponse.data.fileUrl);
      } catch (uploadError) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        setIconUri(null);
      } finally {
        setIsUploadingIcon(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleRemoveIcon = () => {
    setIconUri(null);
    setIconUrl(null);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    if (!shortName.trim()) {
      Alert.alert('Error', 'Please enter a short name/abbreviation');
      return;
    }

    if (shortName.trim().length > MAX_SHORT_NAME_LENGTH) {
      Alert.alert('Error', `Short name must be ${MAX_SHORT_NAME_LENGTH} characters or less`);
      return;
    }

    createChannelMutation.mutate();
  };

  const isValid = name.trim().length > 0 && shortName.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Channel</Text>
        <TouchableOpacity
          style={[styles.headerButton, !isValid && styles.headerButtonDisabled]}
          onPress={handleCreate}
          disabled={!isValid || createChannelMutation.isPending}
        >
          {createChannelMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[styles.createButtonText, !isValid && styles.createButtonTextDisabled]}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Channel Icon */}
          <View style={styles.iconSection}>
            <TouchableOpacity
              style={styles.iconPicker}
              onPress={handlePickImage}
              disabled={isUploadingIcon}
            >
              {iconUri ? (
                <Image source={{ uri: iconUri }} style={styles.iconImage} />
              ) : (
                <View style={styles.iconPlaceholder}>
                  <Icon name="bullhorn" size={40} color={colors.primary} />
                </View>
              )}
              {isUploadingIcon && (
                <View style={styles.iconUploadingOverlay}>
                  <ActivityIndicator size="small" color={colors.textInverse} />
                </View>
              )}
              <View style={styles.iconEditBadge}>
                <Icon name="camera" size={14} color={colors.textInverse} />
              </View>
            </TouchableOpacity>
            {iconUri && (
              <TouchableOpacity style={styles.removeIconButton} onPress={handleRemoveIcon}>
                <Text style={styles.removeIconText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Channel Name */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Channel Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter channel name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(text) => setName(text.slice(0, MAX_NAME_LENGTH))}
              maxLength={MAX_NAME_LENGTH}
            />
            <Text style={styles.charCount}>
              {name.length}/{MAX_NAME_LENGTH}
            </Text>
          </View>

          {/* Short Name */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Short Name / Abbreviation</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., APR, NDA, HQ"
              placeholderTextColor={colors.textSecondary}
              value={shortName}
              onChangeText={(text) => setShortName(text.slice(0, MAX_SHORT_NAME_LENGTH).toUpperCase())}
              maxLength={MAX_SHORT_NAME_LENGTH}
              autoCapitalize="characters"
            />
            <Text style={styles.charCount}>
              {shortName.length}/{MAX_SHORT_NAME_LENGTH}
            </Text>
            <Text style={styles.inputHint}>
              This will be displayed as the channel's badge/icon text
            </Text>
          </View>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this channel about?"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(text) => setDescription(text.slice(0, MAX_DESCRIPTION_LENGTH))}
              maxLength={MAX_DESCRIPTION_LENGTH}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Icon name="information-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Channels are one-way broadcast lists. Only you (the creator) can post messages.
              Followers can view and react to your posts.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.md,
  },
  headerButton: {
    padding: SPACING.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.textInverse,
  },
  createButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.textInverse,
  },
  createButtonTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconPicker: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  iconPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  iconEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  removeIconButton: {
    marginTop: SPACING.sm,
    padding: SPACING.xs,
  },
  removeIconText: {
    fontSize: FONTS.sizes.sm,
    color: colors.error,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  charCount: {
    fontSize: FONTS.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  inputHint: {
    fontSize: FONTS.sizes.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default CreateChannelScreen;
