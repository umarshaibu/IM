import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from '../../components/Avatar';
import * as signalr from '../../services/signalr';
import { useCallStore } from '../../stores/callStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { FONTS, SPACING } from '../../utils/theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { callSoundService } from '../../services/CallSoundService';

type IncomingCallRouteProp = RouteProp<RootStackParamList, 'IncomingCall'>;
type IncomingCallNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const IncomingCallScreen: React.FC = () => {
  const route = useRoute<IncomingCallRouteProp>();
  const navigation = useNavigation<IncomingCallNavigationProp>();
  const { callId, callerName, callerAvatar, callType, conversationId } = route.params;
  const { clearIncomingCall, incomingCall, activeCall } = useCallStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasHandledCancellation = useRef(false);
  const isNavigating = useRef(false);

  // Listen for call cancellation (when caller ends call before we answer)
  useEffect(() => {
    // If incomingCall becomes null while we're still on this screen and not navigating,
    // it means the caller cancelled the call
    if (!incomingCall && !isNavigating.current && !hasHandledCancellation.current) {
      hasHandledCancellation.current = true;
      console.log('Call cancelled by caller, dismissing incoming call screen');
      Vibration.cancel();
      callSoundService.stopAllSounds();
      // Play a short tone to indicate call was cancelled
      callSoundService.playEndedTone();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  }, [incomingCall, navigation]);

  useEffect(() => {
    // Start pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Start vibration pattern for incoming call
    const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true);

    // Play incoming call ringtone
    callSoundService.playIncomingRingtone();

    return () => {
      pulse.stop();
      Vibration.cancel();
      // Stop the ringtone when leaving the screen
      callSoundService.stopAllSounds();
    };
  }, []);

  const handleAccept = async () => {
    console.log('=== ACCEPT BUTTON PRESSED ===');
    console.log('callId:', callId);
    console.log('conversationId:', conversationId);
    console.log('callType:', callType);
    try {
      isNavigating.current = true;
      Vibration.cancel();
      callSoundService.stopAllSounds();
      clearIncomingCall();
      navigation.replace('Call', {
        callId,
        conversationId,
        type: callType,
        isIncoming: true,
      });
    } catch (error) {
      console.error('Failed to accept call:', error);
      isNavigating.current = false;
    }
  };

  const handleDecline = async () => {
    console.log('=== DECLINE BUTTON PRESSED ===');
    console.log('callId:', callId);
    try {
      isNavigating.current = true;
      Vibration.cancel();
      callSoundService.stopAllSounds();
      await signalr.declineCall(callId);
      clearIncomingCall();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to decline call:', error);
      isNavigating.current = false;
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      <View style={styles.callerInfo}>
        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarRing}>
            <Avatar
              uri={callerAvatar}
              name={callerName}
              size={150}
            />
          </View>
        </Animated.View>

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callType}>
          Incoming {callType === 'Video' ? 'Video' : 'Voice'} Call
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionWrapper}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <Icon name="phone-hangup" size={36} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.actionText}>Decline</Text>
        </View>

        <View style={styles.actionWrapper}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <Icon
              name={callType === 'Video' ? 'video' : 'phone'}
              size={36}
              color={colors.textInverse}
            />
          </TouchableOpacity>
          <Text style={styles.actionText}>Accept</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
  },
  callerInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: SPACING.xl,
  },
  avatarRing: {
    padding: 8,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  callerName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  callType: {
    fontSize: FONTS.sizes.lg,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  actionWrapper: {
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  declineButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
  },
  actionText: {
    color: colors.text,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
});

export default IncomingCallScreen;
