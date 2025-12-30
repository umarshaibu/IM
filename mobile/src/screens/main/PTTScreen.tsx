import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Animated,
  Vibration,
  Alert,
  Platform,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { FONTS, SPACING, BORDER_RADIUS } from '../../utils/theme';
import { conversationsApi } from '../../services/api';
import { pttStreamService } from '../../services/PTTStreamService';
import { Conversation, Participant } from '../../types';
import { RootStackParamList } from '../../navigation/RootNavigator';

type PTTScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PTTScreenRouteProp = RouteProp<RootStackParamList, 'PTT'>;

const PTTScreen: React.FC = () => {
  const navigation = useNavigation<PTTScreenNavigationProp>();
  const route = useRoute<PTTScreenRouteProp>();
  const { userId } = useAuthStore();
  const initialConversationId = route.params?.conversationId;
  const { setPTTActive, clearPTTActive } = useChatStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedChannel, setSelectedChannel] = useState<Conversation | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [activePTTUser, setActivePTTUser] = useState<{ name: string; conversationId: string } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Initialize PTT stream service
  useEffect(() => {
    pttStreamService.init();
  }, []);

  // Fetch all conversations for PTT (both individual and group)
  const { data: conversations, refetch } = useQuery({
    queryKey: ['ptt-conversations'],
    queryFn: async () => {
      try {
        const response = await conversationsApi.getAll();
        // Return all conversations (Individual and Group)
        return response.data as Conversation[];
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Auto-select the conversation passed from navigation, or default to first one
  useEffect(() => {
    console.log('PTTScreen useEffect - conversations:', conversations?.length, 'initialConversationId:', initialConversationId, 'selectedChannel:', selectedChannel?.id);

    if (!conversations || conversations.length === 0) return;

    // If a specific conversation was passed from navigation, always select it first
    if (initialConversationId) {
      const targetConversation = conversations.find(c => c.id === initialConversationId);
      console.log('PTTScreen - looking for conversation:', initialConversationId, 'found:', targetConversation?.id, targetConversation?.type);
      if (targetConversation) {
        console.log('PTTScreen - setting selected channel to:', targetConversation.id);
        setSelectedChannel(targetConversation);
        return;
      }
    }

    // Default to first conversation only if nothing is selected
    if (!selectedChannel) {
      console.log('PTTScreen - defaulting to first conversation:', conversations[0]?.id);
      setSelectedChannel(conversations[0]);
    }
  }, [conversations, initialConversationId]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'PTT needs access to your microphone to broadcast voice messages.',
          buttonPositive: 'Grant',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getOnlineCount = (participants: Participant[]): number => {
    return participants?.filter((p) => p.isOnline).length || 0;
  };

  const getParticipantInitials = (participant: Participant): string => {
    const name = participant.displayName || participant.fullName || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayNames = (participants: Participant[]): string => {
    if (!participants || participants.length === 0) return 'No members';

    const names = participants
      .slice(0, 2)
      .map((p) => (p.displayName || p.fullName || 'Unknown').split(' ')[0]);

    if (participants.length > 2) {
      return `${names.join(', ')}, + ${participants.length - 2}`;
    }
    return names.join(', ');
  };

  const startRecording = async () => {
    if (!selectedChannel) {
      setShowChannelPicker(true);
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required for Push-to-Talk.');
      return;
    }

    try {
      setIsRecording(true);
      Vibration.vibrate(50);

      // Start live audio streaming
      const success = await pttStreamService.startStreaming(selectedChannel.id);
      if (!success) {
        setIsRecording(false);
        Alert.alert('Error', 'Failed to start PTT stream. Please try again.');
        return;
      }

      setPTTActive(selectedChannel.id, userId || '', 'You');

      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error starting PTT streaming:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start streaming. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !selectedChannel) return;

    try {
      // Stop live audio streaming
      const { duration } = await pttStreamService.stopStreaming();
      setIsRecording(false);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      clearPTTActive(selectedChannel.id, userId || '');
      Vibration.vibrate(50);

      console.log('PTT streaming stopped, duration:', duration, 'ms');
    } catch (error) {
      console.error('Error stopping PTT streaming:', error);
      setIsRecording(false);
    }
  };

  const handleCallPress = () => {
    if (!selectedChannel) {
      Alert.alert('No Channel', 'Please select a channel first.');
      return;
    }

    navigation.navigate('Call', {
      conversationId: selectedChannel.id,
      type: 'Voice',
    });
  };

  const renderMemberAvatars = () => {
    if (!selectedChannel?.participants) return null;

    const participants = selectedChannel.participants.slice(0, 4);
    const gridSize = participants.length;

    return (
      <View style={styles.avatarGrid}>
        {participants.map((participant, index) => (
          <View
            key={participant.userId}
            style={[
              styles.avatarCell,
              gridSize <= 2 && styles.avatarCellLarge,
            ]}
          >
            <Text style={[
              styles.avatarInitials,
              gridSize <= 2 && styles.avatarInitialsLarge,
            ]}>
              {getParticipantInitials(participant)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.type === 'Group') {
      return conversation.name || 'Unnamed Group';
    }
    // For individual chats, show the other participant's name
    const otherParticipant = conversation.participants?.find(p => p.userId !== userId);
    return otherParticipant?.displayName || otherParticipant?.fullName || 'Unknown';
  };

  const getConversationSubtitle = (conversation: Conversation): string => {
    if (conversation.type === 'Group') {
      return `${conversation.participants?.length || 0} members`;
    }
    return 'Individual chat';
  };

  const renderChannelItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        selectedChannel?.id === item.id && styles.channelItemSelected,
      ]}
      onPress={() => {
        setSelectedChannel(item);
        setShowChannelPicker(false);
      }}
    >
      <View style={styles.channelItemIcon}>
        <Icon
          name={item.type === 'Group' ? 'account-group' : 'account'}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.channelItemInfo}>
        <Text style={styles.channelItemName}>{getConversationName(item)}</Text>
        <Text style={styles.channelItemMembers}>
          {getConversationSubtitle(item)}
        </Text>
      </View>
      {selectedChannel?.id === item.id && (
        <Icon name="check-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Main Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PTT Call</Text>
        </View>

        <View style={styles.divider} />

        {/* Channel Info */}
        <TouchableOpacity
          style={styles.channelInfo}
          onPress={() => setShowChannelPicker(true)}
          activeOpacity={0.7}
        >
          {selectedChannel ? (
            <>
              {renderMemberAvatars()}
              <View style={styles.channelDetails}>
                <Text style={styles.channelNames}>
                  {getDisplayNames(selectedChannel.participants || [])}
                </Text>
                <Text style={styles.onlineStatus}>
                  {getOnlineCount(selectedChannel.participants || [])}/
                  {selectedChannel.participants?.length || 0} Online
                </Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallPress}
              >
                <Icon name="phone" size={20} color={colors.error} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.selectChannelButton}>
              <Icon name="account-group-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.selectChannelText}>Tap to select a channel</Text>
              <Icon name="chevron-down" size={24} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>

        {/* PTT Button */}
        <View style={styles.pttContainer}>
          <Animated.View
            style={[
              styles.pttButtonOuter,
              {
                transform: [{ scale: pulseAnim }],
              },
              isRecording && styles.pttButtonOuterActive,
            ]}
          >
            <Animated.View
              style={[
                styles.pttButtonInner,
                {
                  transform: [{ scale: scaleAnim }],
                },
                isRecording && styles.pttButtonInnerActive,
              ]}
            >
              <TouchableOpacity
                style={styles.pttTouchable}
                onPressIn={startRecording}
                onPressOut={stopRecording}
                activeOpacity={1}
              >
                <Icon
                  name="microphone-outline"
                  size={64}
                  color={isRecording ? '#FFFFFF' : 'rgba(255,255,255,0.8)'}
                />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Text style={styles.pttLabel}>
            {isRecording ? 'Release to Send' : 'Push to Talk'}
          </Text>

          {/* Active PTT Indicator */}
          {activePTTUser && (
            <View style={styles.activePTTBanner}>
              <Animated.View style={[styles.activePTTDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.activePTTText}>
                {activePTTUser.name} is speaking...
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Channel Picker Modal */}
      <Modal
        visible={showChannelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChannelPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Channel</Text>
              <TouchableOpacity
                onPress={() => setShowChannelPicker(false)}
                style={styles.modalClose}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {conversations && conversations.length > 0 ? (
              <FlatList
                data={conversations}
                renderItem={renderChannelItem}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.channelSeparator} />}
                contentContainerStyle={styles.channelList}
              />
            ) : (
              <View style={styles.emptyChannels}>
                <Icon name="message-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyChannelsText}>No conversations available</Text>
                <Text style={styles.emptyChannelsSubtext}>
                  Start a chat to use PTT
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: 400,
    paddingBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 72,
  },
  avatarGrid: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  avatarCell: {
    width: '50%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarCellLarge: {
    width: '50%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  avatarInitialsLarge: {
    fontSize: 14,
  },
  channelDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  channelNames: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  onlineStatus: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectChannelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  selectChannelText: {
    fontSize: FONTS.sizes.md,
    color: colors.textSecondary,
  },
  pttContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  pttButtonOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttButtonOuterActive: {
    borderColor: colors.secondary,
  },
  pttButtonInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttButtonInnerActive: {
    backgroundColor: colors.secondary,
  },
  pttTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: SPACING.lg,
  },
  activePTTBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  activePTTDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textInverse,
    marginRight: SPACING.sm,
  },
  activePTTText: {
    color: colors.textInverse,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalClose: {
    padding: SPACING.xs,
  },
  channelList: {
    padding: SPACING.md,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  channelItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  channelItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelItemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  channelItemName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  channelItemMembers: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  channelSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: SPACING.xs,
  },
  emptyChannels: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyChannelsText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: SPACING.md,
  },
  emptyChannelsSubtext: {
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default PTTScreen;
