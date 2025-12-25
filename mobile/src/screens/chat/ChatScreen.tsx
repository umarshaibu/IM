import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import MessageBubble from '../../components/MessageBubble';
import ChatInput from '../../components/ChatInput';
import Avatar from '../../components/Avatar';
import MediaPicker, { SelectedMedia, LocationData, ContactData } from '../../components/MediaPicker';
import SwipeableMessage from '../../components/SwipeableMessage';
import MessageSelectionBar from '../../components/MessageSelectionBar';
import ReactionsPopup from '../../components/ReactionsPopup';
import { conversationsApi, filesApi } from '../../services/api';
import {
  sendMessage,
  sendTyping,
  sendStopTyping,
  markConversationRead,
  joinConversation,
  leaveConversation,
  deleteMessageWithAudit,
  addReaction,
  starMessage,
  pinMessage,
} from '../../services/signalr';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Message, Conversation } from '../../types';
import { useTheme } from '../../context';
import { FONTS, SPACING } from '../../utils/theme';
// TODO: Re-enable when proper E2E encryption is implemented
// import { encryptForConversation, decryptFromConversation } from '../../services/encryption';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { conversationId } = route.params;
  const { colors } = useTheme();

  const { userId } = useAuthStore();
  const {
    messages,
    setMessages,
    prependMessages,
    typingUsers,
    getConversation,
  } = useChatStore();

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showReactionsPopup, setShowReactionsPopup] = useState(false);
  const [reactionsPosition, setReactionsPosition] = useState({ x: 0, y: 0 });
  const [reactionTargetMessage, setReactionTargetMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const conversation = getConversation(conversationId);
  const conversationMessages = messages[conversationId] || [];
  const typingUserIds = typingUsers[conversationId] || [];

  console.log('Chat render - conversationMessages count:', conversationMessages.length);

  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', conversationId);
      const response = await conversationsApi.getMessages(conversationId, 1, 50);
      const msgs = response.data as Message[];
      console.log('Received messages from API:', msgs.length);

      // TODO: Decrypt message contents when proper E2E encryption is implemented
      // For now, messages are sent in plain text

      return msgs;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  useEffect(() => {
    if (messagesData) {
      console.log('Setting messages in store:', messagesData.length, 'for conversation:', conversationId);
      setMessages(conversationId, messagesData);
      setHasMore(messagesData.length === 50);
    }
  }, [messagesData, conversationId, setMessages]);

  useEffect(() => {
    joinConversation(conversationId);
    markConversationRead(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    const otherParticipant = conversation?.participants.find(
      (p) => p.userId !== userId
    );

    navigation.setOptions({
      headerTitle: '',
      headerLeft: ({ canGoBack }) => (
        <View style={styles.headerLeftContainer}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="chevron-left" size={28} color={colors.headerText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerTitle}
            onPress={() => {
              if (conversation?.type === 'Group') {
                navigation.navigate('GroupInfo', { conversationId });
              } else if (otherParticipant) {
                navigation.navigate('ContactInfo', { userId: otherParticipant.userId });
              }
            }}
          >
            <Avatar
              uri={
                conversation?.type === 'Group'
                  ? conversation.iconUrl
                  : otherParticipant?.profilePictureUrl
              }
              name={
                conversation?.type === 'Group'
                  ? conversation.name || 'Group'
                  : otherParticipant?.displayName || otherParticipant?.fullName || ''
              }
              size={36}
            />
            <View style={styles.headerTitleText}>
              <Text style={styles.headerName} numberOfLines={1}>
                {conversation?.type === 'Group'
                  ? conversation.name
                  : otherParticipant?.displayName || otherParticipant?.fullName}
              </Text>
              {typingUserIds.length > 0 ? (
                <Text style={styles.headerStatus}>typing...</Text>
              ) : conversation?.type === 'Private' && otherParticipant?.isOnline ? (
                <Text style={styles.headerStatus}>online</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              navigation.navigate('Call', {
                conversationId,
                type: 'Video',
              });
            }}
          >
            <Icon name="video" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              navigation.navigate('Call', {
                conversationId,
                type: 'Voice',
              });
            }}
          >
            <Icon name="phone" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, conversation, typingUserIds, userId, conversationId]);

  const handleSendMessage = async (content: string) => {
    try {
      console.log('Sending message:', content);
      // TODO: Implement proper end-to-end encryption with key exchange
      // For now, sending in plain text to fix cross-device messaging

      await sendMessage(conversationId, {
        type: 'Text',
        content: content,
        replyToMessageId: replyingTo?.id,
      });
      console.log('Message sent successfully');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleTypingStart = () => {
    sendTyping(conversationId);
  };

  const handleTypingEnd = () => {
    sendStopTyping(conversationId);
  };

  const handleAttachmentPress = () => {
    setShowMediaPicker(true);
  };

  const handleMediaSelected = async (media: SelectedMedia) => {
    setShowMediaPicker(false);
    setIsUploading(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: media.uri,
        name: media.fileName || `file_${Date.now()}`,
        type: media.mimeType || 'application/octet-stream',
      } as any);

      // Upload file
      const uploadResponse = await filesApi.upload(formData);
      const { fileUrl } = uploadResponse.data;

      // Send message with media
      const messageType = media.type === 'image' ? 'Image'
        : media.type === 'video' ? 'Video'
        : media.type === 'audio' ? 'Audio'
        : 'Document';

      await sendMessage(conversationId, {
        type: messageType,
        mediaUrl: fileUrl,
        replyToMessageId: replyingTo?.id,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send media:', error);
      Alert.alert('Error', 'Failed to send media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendVoiceNote = async (uri: string, _duration: number) => {
    setIsUploading(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: `voice_note_${Date.now()}.mp4`,
        type: 'audio/mp4',
      } as any);

      // Upload file
      const uploadResponse = await filesApi.upload(formData);
      const { fileUrl } = uploadResponse.data;

      // Send message with audio
      await sendMessage(conversationId, {
        type: 'Audio',
        mediaUrl: fileUrl,
        replyToMessageId: replyingTo?.id,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send voice note:', error);
      Alert.alert('Error', 'Failed to send voice note. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocationSelected = async (location: LocationData) => {
    try {
      const locationContent = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      // TODO: Implement proper end-to-end encryption
      const metadata = JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      await sendMessage(conversationId, {
        type: 'Location',
        content: locationContent,
        metadata: metadata,
        replyToMessageId: replyingTo?.id,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send location:', error);
      Alert.alert('Error', 'Failed to send location. Please try again.');
    }
  };

  const handleContactSelected = async (contact: ContactData) => {
    try {
      const contactContent = `${contact.name}\n${contact.phoneNumber}${contact.email ? '\n' + contact.email : ''}`;
      // TODO: Implement proper end-to-end encryption
      const metadata = JSON.stringify({
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email,
      });

      await sendMessage(conversationId, {
        type: 'Contact',
        content: contactContent,
        metadata: metadata,
        replyToMessageId: replyingTo?.id,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send contact:', error);
      Alert.alert('Error', 'Failed to send contact. Please try again.');
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await conversationsApi.getMessages(conversationId, page + 1, 50);
      const newMessages = response.data as Message[];

      // TODO: Decrypt message contents when proper E2E encryption is implemented

      if (newMessages.length > 0) {
        prependMessages(conversationId, newMessages);
        setPage((p) => p + 1);
        setHasMore(newMessages.length === 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Selection mode handlers
  const enterSelectionMode = (message: Message) => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set([message.id]));
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
      if (newSelected.size === 0) {
        exitSelectionMode();
        return;
      }
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const getSelectedMessage = (): Message | null => {
    if (selectedMessages.size === 1) {
      const messageId = Array.from(selectedMessages)[0];
      return conversationMessages.find((m) => m.id === messageId) || null;
    }
    return null;
  };

  // Swipe to reply handler
  const handleSwipeToReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Long press for selection/forward mode
  const handleMessageLongPress = (message: Message) => {
    if (isSelectionMode) {
      toggleMessageSelection(message.id);
    } else {
      enterSelectionMode(message);
    }
  };

  // Double tap for reactions
  const handleDoubleTap = (message: Message, event: { x: number; y: number }) => {
    setReactionTargetMessage(message);
    setReactionsPosition({ x: event.x, y: event.y });
    setShowReactionsPopup(true);
  };

  // Action bar handlers
  const handleReply = () => {
    const message = getSelectedMessage();
    if (message) {
      setReplyingTo(message);
      exitSelectionMode();
    }
  };

  const handleForward = () => {
    if (selectedMessages.size > 0) {
      const messageId = Array.from(selectedMessages)[0];
      exitSelectionMode();
      navigation.navigate('ForwardMessage', { messageId });
    }
  };

  const handleCopy = () => {
    const message = getSelectedMessage();
    if (message?.content) {
      Clipboard.setString(message.content);
      Alert.alert('Copied', 'Message copied to clipboard');
    }
    exitSelectionMode();
  };

  const handleDelete = async () => {
    const message = getSelectedMessage();
    const isMine = message?.senderId === userId;

    Alert.alert(
      'Delete Message',
      isMine
        ? 'Delete this message for everyone or just for yourself?'
        : 'Delete this message for yourself?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          onPress: async () => {
            for (const messageId of selectedMessages) {
              try {
                await deleteMessageWithAudit(messageId, 'ForMe');
              } catch (error) {
                console.error('Failed to delete message:', error);
              }
            }
            exitSelectionMode();
          },
        },
        ...(isMine ? [{
          text: 'Delete for everyone',
          style: 'destructive' as const,
          onPress: async () => {
            for (const messageId of selectedMessages) {
              try {
                await deleteMessageWithAudit(messageId, 'ForEveryone');
              } catch (error) {
                console.error('Failed to delete message:', error);
              }
            }
            exitSelectionMode();
          },
        }] : []),
      ]
    );
  };

  const handleStar = async () => {
    for (const messageId of selectedMessages) {
      try {
        await starMessage(messageId);
      } catch (error) {
        console.error('Failed to star message:', error);
      }
    }
    Alert.alert('Starred', 'Message(s) added to starred messages');
    exitSelectionMode();
  };

  const handleReact = async (emoji: string) => {
    if (reactionTargetMessage) {
      try {
        await addReaction(reactionTargetMessage.id, emoji);
      } catch (error) {
        console.error('Failed to add reaction:', error);
      }
    }
    setReactionTargetMessage(null);
  };

  const scrollToAndHighlightMessage = useCallback((messageId: string) => {
    const messageIndex = conversationMessages.findIndex((m) => m.id === messageId);
    if (messageIndex !== -1) {
      // Scroll to the message
      flatListRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });

      // Highlight the message with animation
      setHighlightedMessageId(messageId);
      highlightAnim.setValue(1);
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setHighlightedMessageId(null);
      });
    }
  }, [conversationMessages, highlightAnim]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderId === userId;
    const showSenderName =
      conversation?.type === 'Group' &&
      !isMine &&
      (index === conversationMessages.length - 1 ||
        conversationMessages[index + 1]?.senderId !== item.senderId);

    const isHighlighted = highlightedMessageId === item.id;
    const isSelected = selectedMessages.has(item.id);
    const highlightBackgroundColor = highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', colors.primary + '30'],
    });

    const messageContent = (
      <TouchableOpacity
        activeOpacity={isSelectionMode ? 0.7 : 1}
        onPress={() => {
          if (isSelectionMode) {
            toggleMessageSelection(item.id);
          }
        }}
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={300}
      >
        <Animated.View
          style={[
            isHighlighted && {
              backgroundColor: highlightBackgroundColor,
              borderRadius: 12,
            },
            isSelected && {
              backgroundColor: colors.primary + '20',
              borderRadius: 12,
            },
          ]}
        >
          <MessageBubble
            message={item}
            isMine={isMine}
            showSenderName={showSenderName}
            onLongPress={() => handleMessageLongPress(item)}
            onReplyPress={() => {
              if (item.replyToMessageId) {
                scrollToAndHighlightMessage(item.replyToMessageId);
              }
            }}
          />
        </Animated.View>
      </TouchableOpacity>
    );

    // Wrap with swipeable only when not in selection mode
    if (!isSelectionMode) {
      return (
        <SwipeableMessage
          onSwipeToReply={() => handleSwipeToReply(item)}
          enabled={!item.isDeleted}
        >
          {messageContent}
        </SwipeableMessage>
      );
    }

    return messageContent;
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedMessage = getSelectedMessage();
  const canCopy = selectedMessage?.type === 'Text' && !!selectedMessage?.content;
  const canEdit = selectedMessage?.senderId === userId && selectedMessage?.type === 'Text' && !selectedMessage?.isDeleted;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Selection Mode Top Action Bar */}
        {isSelectionMode && (
          <MessageSelectionBar
            selectedCount={selectedMessages.size}
            onClose={exitSelectionMode}
            onDelete={handleDelete}
            onForward={handleForward}
            onCopy={handleCopy}
            onReply={handleReply}
            onStar={handleStar}
            canCopy={canCopy}
            canReply={selectedMessages.size === 1}
            canEdit={canEdit}
          />
        )}

        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.messagesList}
            onScrollToIndexFailed={(info) => {
              // If scroll fails, wait and try again
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }, 100);
            }}
          />
        </View>

        {!isSelectionMode && (
          <ChatInput
            onSendMessage={handleSendMessage}
            onAttachmentPress={handleAttachmentPress}
            onSendVoiceNote={handleSendVoiceNote}
            onTypingStart={handleTypingStart}
            onTypingEnd={handleTypingEnd}
            replyingTo={
              replyingTo
                ? {
                    id: replyingTo.id,
                    senderName: replyingTo.senderName || '',
                    content: replyingTo.content || replyingTo.type,
                  }
                : null
            }
            onCancelReply={() => setReplyingTo(null)}
            disabled={isUploading}
          />
        )}

        <MediaPicker
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onMediaSelected={handleMediaSelected}
          onLocationSelected={handleLocationSelected}
          onContactSelected={handleContactSelected}
        />

        {/* Reactions Popup */}
        <ReactionsPopup
          visible={showReactionsPopup}
          position={reactionsPosition}
          onReact={handleReact}
          onClose={() => {
            setShowReactionsPopup(false);
            setReactionTargetMessage(null);
          }}
        />
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: SPACING.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleText: {
    marginLeft: SPACING.sm,
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    maxWidth: 150,
  },
  headerStatus: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: SPACING.sm,
  },
  loadingMore: {
    padding: SPACING.md,
    alignItems: 'center',
  },
});

export default ChatScreen;
