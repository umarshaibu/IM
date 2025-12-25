import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from './ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Notification types
export type NotificationType = 'message' | 'call' | 'success' | 'error' | 'warning' | 'info';

// Notification data
export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  avatarUrl?: string;
  duration?: number;
  onPress?: () => void;
  data?: Record<string, unknown>;
}

// Context type
interface NotificationContextType {
  showNotification: (notification: Omit<InAppNotification, 'id'>) => string;
  hideNotification: (id?: string) => void;
  clearAllNotifications: () => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
  children: ReactNode;
}

// Single notification component
const NotificationToast: React.FC<{
  notification: InAppNotification;
  onHide: (id: string) => void;
  index: number;
}> = ({ notification, onHide, index }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get icon and color based on type
  const getTypeConfig = () => {
    switch (notification.type) {
      case 'message':
        return { icon: 'message-text', color: colors.primary };
      case 'call':
        return { icon: 'phone', color: colors.callAccept };
      case 'success':
        return { icon: 'check-circle', color: colors.success };
      case 'error':
        return { icon: 'alert-circle', color: colors.error };
      case 'warning':
        return { icon: 'alert', color: colors.warning };
      case 'info':
      default:
        return { icon: 'information', color: colors.info };
    }
  };

  const { icon, color } = getTypeConfig();

  React.useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const duration = notification.duration || 4000;
    hideTimeoutRef.current = setTimeout(() => {
      handleHide();
    }, duration);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(notification.id);
    });
  };

  const handlePress = () => {
    if (notification.onPress) {
      notification.onPress();
    }
    handleHide();
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: insets.top + 10 + (index * 80),
          transform: [{ translateY }],
          opacity,
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#666',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {notification.message && (
            <Text
              style={[styles.message, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
          )}
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleHide}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Generate unique ID
  const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Show notification
  const showNotification = useCallback((notification: Omit<InAppNotification, 'id'>) => {
    const id = generateId();
    const newNotification: InAppNotification = { ...notification, id };

    setNotifications(prev => {
      // Limit to 3 notifications at a time
      const updated = [newNotification, ...prev].slice(0, 3);
      return updated;
    });

    return id;
  }, []);

  // Hide notification
  const hideNotification = useCallback((id?: string) => {
    if (id) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      // Hide the most recent one
      setNotifications(prev => prev.slice(1));
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, clearAllNotifications }}>
      {children}
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onHide={hideNotification}
          index={index}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useInAppNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useInAppNotification must be used within a NotificationProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: SCREEN_WIDTH - 32,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
