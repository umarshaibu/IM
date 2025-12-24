import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { SPACING, BORDER_RADIUS } from '../../utils/theme';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

// Theme colors matching the design
const AUTH_COLORS = {
  background: '#E8E8E8', // Light gray background
  primary: '#0D3B2E', // Dark green for button
  text: '#000000',
  textSecondary: '#666666',
  indicatorActive: '#0D3B2E',
  indicatorInactive: '#CCCCCC',
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AUTH_COLORS.background} />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Army Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/army_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Chat Icon and App Name */}
        <View style={styles.brandContainer}>
          <Icon name="chat" size={32} color={AUTH_COLORS.primary} />
          <Text style={styles.appName}>NAIM</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Page Indicator */}
        <View style={styles.pageIndicator}>
          <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
          <View style={styles.indicatorDot} />
          <View style={styles.indicatorDot} />
          <View style={styles.indicatorDot} />
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('ServiceNumber')}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 180,
    height: 180,
  },
  brandContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: AUTH_COLORS.text,
    letterSpacing: 2,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 50,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
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
  getStartedButton: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
