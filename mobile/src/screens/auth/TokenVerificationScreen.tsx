import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { SPACING, BORDER_RADIUS } from '../../utils/theme';

type TokenVerificationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TokenVerification'>;
  route: RouteProp<RootStackParamList, 'TokenVerification'>;
};

// Theme colors matching the design
const AUTH_COLORS = {
  background: '#E8E8E8',
  primary: '#0D3B2E',
  text: '#000000',
  textSecondary: '#666666',
  textMuted: '#888888',
  keypadBg: '#F5F5F5',
  keypadText: '#000000',
  indicatorActive: '#0D3B2E',
  indicatorInactive: '#CCCCCC',
};

const CODE_LENGTH = 6;

const TokenVerificationScreen: React.FC<TokenVerificationScreenProps> = ({ navigation, route }) => {
  const { serviceNumber, fullName } = route.params;
  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { login } = useAuthStore();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      // Find the last filled position
      let lastFilledIndex = -1;
      for (let i = code.length - 1; i >= 0; i--) {
        if (code[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }
      if (lastFilledIndex >= 0) {
        const newCode = [...code];
        newCode[lastFilledIndex] = '';
        setCode(newCode);
      }
    } else {
      // Find the first empty position
      const firstEmptyIndex = code.findIndex(d => d === '');
      if (firstEmptyIndex >= 0) {
        const newCode = [...code];
        newCode[firstEmptyIndex] = key;
        setCode(newCode);

        // Auto-submit when all digits are entered
        if (firstEmptyIndex === CODE_LENGTH - 1) {
          const fullCode = newCode.join('');
          handleVerify(fullCode);
        }
      }
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== CODE_LENGTH) {
      Alert.alert('Error', 'Please enter the complete activation code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyLoginToken(serviceNumber, codeToVerify);
      const data = response.data;

      await login(
        data.userId,
        {
          id: data.userId,
          serviceNumber: serviceNumber,
          fullName: data.displayName,
          phoneNumber: data.phoneNumber,
          displayName: data.displayName,
          profilePictureUrl: data.profilePictureUrl,
          isOnline: true,
          showLastSeen: true,
          showProfilePhoto: true,
          showAbout: true,
          readReceipts: true,
        },
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        }
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid activation code. Please try again.';
      Alert.alert('Error', message);
      setCode(new Array(CODE_LENGTH).fill(''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await authApi.requestLoginToken(serviceNumber);
      Alert.alert('Success', 'A new activation code has been sent');
      setCountdown(60);
      setCanResend(false);
      setCode(new Array(CODE_LENGTH).fill(''));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend code. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const renderKeypadButton = (value: string, subText?: string) => (
    <TouchableOpacity
      key={value}
      style={styles.keypadButton}
      onPress={() => handleKeyPress(value)}
      activeOpacity={0.7}
    >
      <Text style={styles.keypadButtonText}>{value}</Text>
      {subText && <Text style={styles.keypadSubText}>{subText}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AUTH_COLORS.background} />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={AUTH_COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        {/* Logo */}
        <Image
          source={require('../../assets/images/army_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Welcome Text with Chat Icon */}
        <View style={styles.brandContainer}>
          <Icon name="chat" size={24} color={AUTH_COLORS.primary} />
          <Text style={styles.welcomeText}>Welcome to NAIM</Text>
        </View>
        <Text style={styles.subtitleText}>Enter Activation Code</Text>

        {/* Code Display */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <View key={index} style={styles.codeBox}>
              {digit ? (
                <Text style={styles.codeDigit}>{digit}</Text>
              ) : (
                <Text style={styles.codeDash}>-</Text>
              )}
            </View>
          ))}
        </View>

        {/* Activate Button */}
        <TouchableOpacity
          style={[styles.activateButton, isLoading && styles.buttonDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.activateButtonText}>Activate</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        {canResend ? (
          <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
            <Text style={styles.resendLink}>Resend Code</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.countdownText}>Resend in {countdown}s</Text>
        )}
      </View>

      {/* Keypad Section */}
      <View style={styles.keypadSection}>
        <View style={styles.keypadRow}>
          {renderKeypadButton('1', '')}
          {renderKeypadButton('2', 'ABC')}
          {renderKeypadButton('3', 'DEF')}
        </View>
        <View style={styles.keypadRow}>
          {renderKeypadButton('4', 'GHI')}
          {renderKeypadButton('5', 'JKL')}
          {renderKeypadButton('6', 'MNO')}
        </View>
        <View style={styles.keypadRow}>
          {renderKeypadButton('7', 'PQRS')}
          {renderKeypadButton('8', 'TUV')}
          {renderKeypadButton('9', 'WXYZ')}
        </View>
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.keypadButton} activeOpacity={0.7}>
            <Text style={styles.keypadButtonText}>*#</Text>
          </TouchableOpacity>
          {renderKeypadButton('0', '')}
          <TouchableOpacity
            style={styles.keypadButton}
            onPress={() => handleKeyPress('backspace')}
            activeOpacity={0.7}
          >
            <Icon name="backspace-outline" size={24} color={AUTH_COLORS.keypadText} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
    alignSelf: 'flex-start',
  },
  contentSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.md,
  },
  brandContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: AUTH_COLORS.text,
  },
  subtitleText: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  codeBox: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeDigit: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AUTH_COLORS.text,
  },
  codeDash: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AUTH_COLORS.textMuted,
  },
  activateButton: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl * 2,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: AUTH_COLORS.primary,
  },
  countdownText: {
    fontSize: 14,
    color: AUTH_COLORS.textMuted,
  },
  keypadSection: {
    backgroundColor: AUTH_COLORS.keypadBg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  keypadButton: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '400',
    color: AUTH_COLORS.keypadText,
  },
  keypadSubText: {
    fontSize: 10,
    color: AUTH_COLORS.textMuted,
    marginTop: -2,
  },
});

export default TokenVerificationScreen;
