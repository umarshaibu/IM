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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import MessageBubble from '../../components/MessageBubble';
import ChatInput from '../../components/ChatInput';
import Avatar from '../../components/Avatar';
import MediaPicker, { SelectedMedia, LocationData, ContactData } from '../../components/MediaPicker';
import { conversationsApi, filesApi } from '../../services/api';
import {
  sendMessage,
  sendTyping,
  sendStopTyping,
  markConversationRead,
  joinConversation,
  leaveConversation,
} from '../../services/signalr';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Message, Conversation } from '../../types';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
// TODO: Re-enable when proper E2E encryption is implemented
// import { encryptForConversation, decryptFromConversation } from '../../services/encryption';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { conversationId } = route.params;

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
              <Icon name="chevron-left" size={28} color={COLORS.textLight} />
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
            <Icon name="video" size={24} color={COLORS.textLight} />
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
            <Icon name="phone" size={24} color={COLORS.textLight} />
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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderId === userId;
    const showSenderName =
      conversation?.type === 'Group' &&
      !isMine &&
      (index === conversationMessages.length - 1 ||
        conversationMessages[index + 1]?.senderId !== item.senderId);

    return (
      <MessageBubble
        message={item}
        isMine={isMine}
        showSenderName={showSenderName}
        onLongPress={() => {
          // Show message options
        }}
        onReplyPress={() => {
          if (item.replyToMessage) {
            // Scroll to reply message
          }
        }}
      />
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
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
        />
      </View>

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

      <MediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onMediaSelected={handleMediaSelected}
        onLocationSelected={handleLocationSelected}
        onContactSelected={handleContactSelected}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
    color: COLORS.textLight,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    maxWidth: 150,
  },
  headerStatus: {
    color: COLORS.textLight,
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
