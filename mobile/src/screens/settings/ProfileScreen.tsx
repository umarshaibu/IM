import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Avatar from '../../components/Avatar';
import { usersApi, filesApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [about, setAbout] = useState(user?.about || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await usersApi.updateProfile({
        displayName,
        about,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUser({ ...user, ...data });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update profile');
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

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'profile.jpg',
        } as any);

        const uploadResponse = await filesApi.upload(formData);
        const { url } = uploadResponse.data;

        await usersApi.updateProfile({ profilePictureUrl: url });
        setUser({ ...user, profilePictureUrl: url });
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />

      {/* Profile Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={isUploading}
            activeOpacity={0.9}
          >
            {isUploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={colors.textInverse} />
              </View>
            ) : null}
            <View style={styles.avatarWrapper}>
              <Avatar
                uri={user?.profilePictureUrl}
                name={user?.displayName || user?.fullName || ''}
                size={110}
              />
            </View>
            <View style={styles.cameraIconContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F0F0F0']}
                style={styles.cameraIcon}
              >
                <Icon name="camera" size={20} color={colors.primary} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerName}>
            {user?.displayName || user?.fullName || 'Your Name'}
          </Text>
          <Text style={styles.headerAbout}>
            {user?.about || 'Hey there! I am using IM'}
          </Text>
        </View>
      </LinearGradient>

      {/* Profile Fields */}
      <View style={styles.fieldsContainer}>
        {/* Name Field */}
        <View style={styles.fieldCard}>
          <TouchableOpacity
            style={styles.fieldItem}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.fieldIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="account-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {user?.displayName || user?.fullName || 'Not set'}
                </Text>
              )}
            </View>
            {!isEditing && (
              <View style={styles.editIconContainer}>
                <Icon name="pencil-outline" size={18} color={colors.secondary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.fieldHint}>
            This is not your username or pin. This name will be visible to your contacts.
          </Text>
        </View>

        {/* About Field */}
        <View style={styles.fieldCard}>
          <TouchableOpacity
            style={styles.fieldItem}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.fieldIconContainer, { backgroundColor: '#FF950015' }]}>
              <Icon name="information-outline" size={22} color="#FF9500" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>About</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.aboutInput]}
                  value={about}
                  onChangeText={setAbout}
                  placeholder="Write something about yourself"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={139}
                />
              ) : (
                <Text style={styles.fieldValue} numberOfLines={2}>
                  {user?.about || 'Hey there! I am using IM'}
                </Text>
              )}
            </View>
            {!isEditing && (
              <View style={styles.editIconContainer}>
                <Icon name="pencil-outline" size={18} color={colors.secondary} />
              </View>
            )}
          </TouchableOpacity>
          {isEditing && (
            <Text style={styles.charCount}>
              {about.length}/139
            </Text>
          )}
        </View>

        {/* Phone Field */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldItem}>
            <View style={[styles.fieldIconContainer, { backgroundColor: '#34C75915' }]}>
              <Icon name="phone-outline" size={22} color="#34C759" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <Text style={styles.fieldValue}>
                {user?.phoneNumber || 'Not set'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={16} color={colors.secondary} />
            </View>
          </View>
        </View>

        {/* Service Number Field */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldItem}>
            <View style={[styles.fieldIconContainer, { backgroundColor: '#5856D615' }]}>
              <Icon name="badge-account-horizontal-outline" size={22} color="#5856D6" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Service Number</Text>
              <Text style={styles.fieldValue}>
                {user?.serviceNumber || 'Not set'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="shield-check" size={16} color="#5856D6" />
            </View>
          </View>
          <Text style={styles.fieldHint}>
            Your service number is verified from the nominal roll.
          </Text>
        </View>
      </View>

      {/* Edit Actions */}
      {isEditing && (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setDisplayName(user?.displayName || '');
              setAbout(user?.about || '');
              setIsEditing(false);
            }}
            activeOpacity={0.7}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              updateMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Icon name="check" size={20} color={colors.textInverse} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatarWrapper: {
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 60,
    padding: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: colors.textInverse,
    marginBottom: SPACING.xs,
  },
  headerAbout: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  fieldsContainer: {
    marginTop: -30,
    paddingHorizontal: SPACING.md,
  },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
  },
  fieldIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  fieldContent: {
    flex: 1,
    paddingTop: 2,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  fieldValue: {
    fontSize: FONTS.sizes.md,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 22,
  },
  fieldInput: {
    fontSize: FONTS.sizes.md,
    color: colors.text,
    fontWeight: '500',
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
    paddingVertical: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  aboutInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  editIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldHint: {
    fontSize: FONTS.sizes.xs,
    color: colors.textMuted,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingLeft: SPACING.lg + 44 + SPACING.md,
    lineHeight: 18,
  },
  charCount: {
    fontSize: FONTS.sizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: colors.surface,
    gap: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.md,
    color: colors.textInverse,
    fontWeight: '600',
  },
  bottomPadding: {
    height: SPACING.xxl,
  },
});

export default ProfileScreen;
