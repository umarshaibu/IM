import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../services/api';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Conversation } from '../types';

export const useConversations = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const {
    conversations,
    setConversations,
    updateConversation,
    removeConversation,
  } = useChatStore();

  // Fetch all conversations
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await conversationsApi.getAll();
      return response.data as Conversation[];
    },
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setConversations(data);
    }
  }, [data, setConversations]);

  // Create private conversation
  const createPrivateMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const response = await conversationsApi.getOrCreatePrivate(otherUserId);
      return response.data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Create group conversation
  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      iconUrl?: string;
      memberIds: string[];
    }) => {
      const response = await conversationsApi.createGroup(data);
      return response.data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Update conversation
  const updateConversationMutation = useMutation({
    mutationFn: async ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: { name?: string; description?: string; iconUrl?: string };
    }) => {
      await conversationsApi.update(conversationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Mute conversation
  const muteMutation = useMutation({
    mutationFn: async ({
      conversationId,
      until,
    }: {
      conversationId: string;
      until?: string;
    }) => {
      await conversationsApi.mute(conversationId, until);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Archive conversation
  const archiveMutation = useMutation({
    mutationFn: async ({
      conversationId,
      archive,
    }: {
      conversationId: string;
      archive: boolean;
    }) => {
      await conversationsApi.archive(conversationId, archive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Leave group
  const leaveGroupMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await conversationsApi.leave(conversationId);
    },
    onSuccess: (_, conversationId) => {
      removeConversation(conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Set message expiry
  const setExpiryMutation = useMutation({
    mutationFn: async ({
      conversationId,
      expiry,
    }: {
      conversationId: string;
      expiry: number;
    }) => {
      await conversationsApi.setMessageExpiry(conversationId, expiry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Helper to get conversation display name
  const getConversationName = useCallback(
    (conversation: Conversation): string => {
      if (conversation.type === 'Group') {
        return conversation.name || 'Group';
      }
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== userId
      );
      return (
        otherParticipant?.displayName ||
        otherParticipant?.fullName ||
        'Unknown'
      );
    },
    [userId]
  );

  // Helper to get conversation avatar
  const getConversationAvatar = useCallback(
    (conversation: Conversation): string | undefined => {
      if (conversation.type === 'Group') {
        return conversation.iconUrl;
      }
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== userId
      );
      return otherParticipant?.profilePictureUrl;
    },
    [userId]
  );

  // Sort conversations by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    conversations: sortedConversations,
    isLoading,
    isError,
    error,
    refetch,
    createPrivateConversation: createPrivateMutation.mutateAsync,
    isCreatingPrivate: createPrivateMutation.isPending,
    createGroupConversation: createGroupMutation.mutateAsync,
    isCreatingGroup: createGroupMutation.isPending,
    updateConversation: updateConversationMutation.mutate,
    isUpdating: updateConversationMutation.isPending,
    muteConversation: muteMutation.mutate,
    archiveConversation: archiveMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    setMessageExpiry: setExpiryMutation.mutate,
    getConversationName,
    getConversationAvatar,
  };
};

export default useConversations;
