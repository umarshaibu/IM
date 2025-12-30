import React, { useMemo } from 'react';
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
import { useTheme, ThemeColors } from '../../context/ThemeContext';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

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
          <Icon name="chat" size={32} color={colors.primary} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
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
    backgroundColor: colors.border,
  },
  indicatorDotActive: {
    backgroundColor: colors.primary,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
