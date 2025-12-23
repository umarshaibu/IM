import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/theme';

type MessageStatus = 'Sending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number;
}

const MessageStatusIcon: React.FC<MessageStatusIconProps> = ({
  status,
  size = 16,
}) => {
  const getIconConfig = () => {
    switch (status) {
      case 'Sending':
        return { name: 'clock-outline', color: COLORS.tick };
      case 'Sent':
        return { name: 'check', color: COLORS.tick };
      case 'Delivered':
        return { name: 'check-all', color: COLORS.tick };
      case 'Read':
        return { name: 'check-all', color: COLORS.tickBlue };
      case 'Failed':
        return { name: 'alert-circle-outline', color: COLORS.error };
      default:
        return { name: 'check', color: COLORS.tick };
    }
  };

  const { name, color } = getIconConfig();

  return (
    <View style={styles.container}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
  },
});

export default MessageStatusIcon;
