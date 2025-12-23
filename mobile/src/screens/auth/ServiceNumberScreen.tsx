import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { authApi } from '../../services/api';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';

type ServiceNumberScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServiceNumber'>;
};

const ServiceNumberScreen: React.FC<ServiceNumberScreenProps> = ({ navigation }) => {
  const [serviceNumber, setServiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedServiceNumber = serviceNumber.trim().toUpperCase();

    if (!trimmedServiceNumber) {
      Alert.alert('Error', 'Please enter your service number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.requestLoginToken(trimmedServiceNumber);
      const data = response.data;

      if (data.success) {
        navigation.navigate('TokenVerification', {
          serviceNumber: trimmedServiceNumber,
          fullName: data.fullName || '',
          maskedEmail: data.maskedEmail,
          maskedPhone: data.maskedPhone,
        });
      } else {
        Alert.alert(
          'Not Found',
          data.message || 'Service number not found. Please contact your administrator.'
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to process request. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="card-account-details" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Enter Service Number</Text>
            <Text style={styles.subtitle}>
              Enter your service number to receive a verification code via SMS and email
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Service Number</Text>
              <View style={styles.inputWrapper}>
                <Icon name="badge-account-horizontal" size={22} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={serviceNumber}
                  onChangeText={setServiceNumber}
                  placeholder="e.g. AP/12345"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Icon name="arrow-right" size={20} color={COLORS.textLight} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Icon name="information-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              A 6-digit verification code will be sent to your registered email and phone number
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
  form: {
    marginBottom: SPACING.xxl,
  },
  inputContainer: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.lg,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    letterSpacing: 1,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: COLORS.textLight,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.inputBackground,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ServiceNumberScreen;
