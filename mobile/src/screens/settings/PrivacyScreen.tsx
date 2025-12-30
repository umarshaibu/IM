import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING } from '../../utils/theme';

type PrivacyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PrivacyScreen: React.FC = () => {
  const navigation = useNavigation<PrivacyScreenNavigationProp>();
  const { user, setUser } = useAuthStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showLastSeen, setShowLastSeen] = useState(user?.showLastSeen ?? true);
  const [showProfilePhoto, setShowProfilePhoto] = useState(user?.showProfilePhoto ?? true);
  const [showAbout, setShowAbout] = useState(user?.showAbout ?? true);
  const [readReceipts, setReadReceipts] = useState(user?.readReceipts ?? true);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      showLastSeen?: boolean;
      showProfilePhoto?: boolean;
      showAbout?: boolean;
      readReceipts?: boolean;
    }) => {
      const response = await usersApi.updatePrivacy(data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser({ ...user, ...data });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update privacy settings');
    },
  });

  const handleToggle = (
    setting: 'showLastSeen' | 'showProfilePhoto' | 'showAbout' | 'readReceipts',
    value: boolean
  ) => {
    switch (setting) {
      case 'showLastSeen':
        setShowLastSeen(value);
        break;
      case 'showProfilePhoto':
        setShowProfilePhoto(value);
        break;
      case 'showAbout':
        setShowAbout(value);
        break;
      case 'readReceipts':
        setReadReceipts(value);
        break;
    }
    updateMutation.mutate({ [setting]: value });
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who can see my personal info</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Last seen</Text>
            <Text style={styles.settingValue}>
              {showLastSeen ? 'Everyone' : 'Nobody'}
            </Text>
          </View>
          <Switch
            value={showLastSeen}
            onValueChange={(value) => handleToggle('showLastSeen', value)}
            trackColor={{ false: colors.divider, true: colors.secondary }}
            thumbColor={colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Profile photo</Text>
            <Text style={styles.settingValue}>
              {showProfilePhoto ? 'Everyone' : 'Nobody'}
            </Text>
          </View>
          <Switch
            value={showProfilePhoto}
            onValueChange={(value) => handleToggle('showProfilePhoto', value)}
            trackColor={{ false: colors.divider, true: colors.secondary }}
            thumbColor={colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>About</Text>
            <Text style={styles.settingValue}>
              {showAbout ? 'Everyone' : 'Nobody'}
            </Text>
          </View>
          <Switch
            value={showAbout}
            onValueChange={(value) => handleToggle('showAbout', value)}
            trackColor={{ false: colors.divider, true: colors.secondary }}
            thumbColor={colors.textInverse}
          />
        </TouchableOpacity>

        <Text style={styles.sectionHint}>
          If you don't share your last seen, you won't be able to see other people's last seen.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Messaging</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Read receipts</Text>
            <Text style={styles.settingHintText}>
              If turned off, you won't send or receive read receipts
            </Text>
          </View>
          <Switch
            value={readReceipts}
            onValueChange={(value) => handleToggle('readReceipts', value)}
            trackColor={{ false: colors.divider, true: colors.secondary }}
            thumbColor={colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Disappearing messages</Text>
            <Text style={styles.settingValue}>Off</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocking</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('BlockedUsers')}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Blocked contacts</Text>
            <Text style={styles.settingValue}>
              Tap to see blocked contacts
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>App lock</Text>
            <Text style={styles.settingValue}>Off</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Two-step verification</Text>
            <Text style={styles.settingValue}>Off</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Change password</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.surface,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionHint: {
    fontSize: FONTS.sizes.sm,
    color: colors.textMuted,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  settingValue: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
  },
  settingHintText: {
    fontSize: FONTS.sizes.sm,
    color: colors.textMuted,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
});

export default PrivacyScreen;
