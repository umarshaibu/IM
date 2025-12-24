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
  StatusBar,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { authApi } from '../../services/api';
import { SPACING, BORDER_RADIUS } from '../../utils/theme';

type ServiceNumberScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServiceNumber'>;
};

// Theme colors matching the design
const AUTH_COLORS = {
  background: '#E8E8E8',
  inputBackground: '#D0D0D0',
  primary: '#0D3B2E',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#888888',
  link: '#4A90D9',
  indicatorActive: '#0D3B2E',
  indicatorInactive: '#CCCCCC',
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
      <StatusBar barStyle="dark-content" backgroundColor={AUTH_COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/army_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Welcome Text with Chat Icon */}
          <View style={styles.brandContainer}>
            <Icon name="chat" size={28} color={AUTH_COLORS.primary} />
            <Text style={styles.welcomeText}>Welcome to NAIM</Text>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={serviceNumber}
                onChangeText={setServiceNumber}
                placeholder="Svc No"
                placeholderTextColor={AUTH_COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Privacy Policy */}
          <View style={styles.privacySection}>
            <Text style={styles.privacyText}>Read our </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.privacyLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {/* Page Indicator */}
          <View style={styles.pageIndicator}>
            <View style={styles.indicatorDot} />
            <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
            <View style={styles.indicatorDot} />
            <View style={styles.indicatorDot} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoSection: {
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xxl,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: AUTH_COLORS.text,
  },
  inputSection: {
    width: '100%',
    maxWidth: 280,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    backgroundColor: AUTH_COLORS.inputBackground,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  input: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: AUTH_COLORS.text,
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacySection: {
    flexDirection: 'row',
    marginBottom: SPACING.xxl,
  },
  privacyText: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
  },
  privacyLink: {
    fontSize: 14,
    color: AUTH_COLORS.link,
    textDecorationLine: 'underline',
  },
  pageIndicator: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  indicatorDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: AUTH_COLORS.indicatorInactive,
  },
  indicatorDotActive: {
    backgroundColor: AUTH_COLORS.indicatorActive,
  },
});

export default ServiceNumberScreen;
