import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { useChatStore } from '../stores/chatStore';

interface PTTNotificationData {
  conversationId: string;
  senderId: string;
  senderName: string;
}

interface GlobalPTTNotificationProps {
  onPress?: (conversationId: string) => void;
}

const GlobalPTTNotification: React.FC<GlobalPTTNotificationProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const [notification, setNotification] = useState<PTTNotificationData | null>(null);
  const [visible, setVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to native PTT events
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const { CallEventModule } = NativeModules;
    if (!CallEventModule) {
      console.warn('CallEventModule not available');
      return;
    }

    const eventEmitter = new NativeEventEmitter(CallEventModule);

    const subscription = eventEmitter.addListener('onPTTReceived', (data: PTTNotificationData) => {
      console.log('GlobalPTTNotification: Received PTT event:', data);
      showNotification(data);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Also listen to pttSessions from the chat store (for SignalR-based PTT)
  const pttSessions = useChatStore((state) => state.pttSessions);

  useEffect(() => {
    const activeSessions = Object.entries(pttSessions);
    if (activeSessions.length > 0) {
      const [conversationId, session] = activeSessions[0];
      showNotification({
        conversationId,
        senderId: session.userId,
        senderName: session.userName,
      });
    } else if (notification && !Object.keys(pttSessions).length) {
      // PTT session ended
      hideNotification();
    }
  }, [pttSessions]);

  const showNotification = (data: PTTNotificationData) => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setNotification(data);
    setVisible(true);

    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Start pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Auto-hide after 10 seconds if no new activity
    hideTimeoutRef.current = setTimeout(() => {
      hideNotification();
    }, 10000);
  };

  const hideNotification = () => {
    // Slide out animation
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setNotification(null);
    });
  };

  const handlePress = () => {
    if (notification && onPress) {
      onPress(notification.conversationId);
    }
    hideNotification();
  };

  if (!visible || !notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Icon name="microphone" size={28} color="#FFFFFF" />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>PTT Active</Text>
          <Text style={styles.senderText} numberOfLines={1}>
            {notification.senderName} is speaking
          </Text>
        </View>

        {/* Sound wave animation */}
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  opacity: 0.9 - index * 0.15,
                  transform: [
                    {
                      scaleY: pulseAnim.interpolate({
                        inputRange: [1, 1.2],
                        outputRange: [0.4 + index * 0.15, 1 - index * 0.1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Icon name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  titleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  senderText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    marginTop: 2,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: SPACING.sm,
  },
  waveBar: {
    width: 4,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
});

export default GlobalPTTNotification;
