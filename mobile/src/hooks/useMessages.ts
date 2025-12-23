import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi, messagesApi } from '../services/api';
import { sendMessage as sendSignalRMessage } from '../services/signalr';
import { useChatStore } from '../stores/chatStore';
import { Message, MessageType } from '../types';

interface SendMessageParams {
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  replyToMessageId?: string;
}

export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const { messages, setMessages, prependMessages, addMessage } = useChatStore();

  const conversationMessages = messages[conversationId] || [];

  // Fetch initial messages
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await conversationsApi.getMessages(conversationId, 1, 50);
      return response.data as Message[];
    },
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setMessages(conversationId, data);
    }
  }, [data, conversationId, setMessages]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async (page: number) => {
    try {
      const response = await conversationsApi.getMessages(conversationId, page, 50);
      const newMessages = response.data as Message[];

      if (newMessages.length > 0) {
        prependMessages(conversationId, newMessages);
      }

      return newMessages.length === 50; // hasMore
    } catch (error) {
      console.error('Error loading more messages:', error);
      return false;
    }
  }, [conversationId, prependMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      await sendSignalRMessage(conversationId, params);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      await messagesApi.edit(messageId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async ({ messageId, forEveryone }: { messageId: string; forEveryone: boolean }) => {
      await messagesApi.delete(messageId, forEveryone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messagesApi.markRead(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Forward message
  const forwardMessage = useCallback(async (messageId: string, targetConversationIds: string[]) => {
    try {
      await messagesApi.forward(messageId, targetConversationIds);
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }, []);

  return {
    messages: conversationMessages,
    isLoading,
    isError,
    error,
    refetch,
    loadMoreMessages,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    editMessage: editMessageMutation.mutate,
    isEditing: editMessageMutation.isPending,
    deleteMessage: deleteMessageMutation.mutate,
    isDeleting: deleteMessageMutation.isPending,
    markAsRead,
    forwardMessage,
  };
};

export default useMessages;
