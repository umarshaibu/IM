import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi, usersApi } from '../services/api';
import { Contact, UserProfile } from '../types';

export const useContacts = () => {
  const queryClient = useQueryClient();

  // Fetch all contacts
  const {
    data: contacts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await contactsApi.getAll();
      return response.data as Contact[];
    },
  });

  // Fetch favorite contacts
  const {
    data: favorites = [],
    isLoading: isFavoritesLoading,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await contactsApi.getFavorites();
      return response.data as Contact[];
    },
  });

  // Search users
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await usersApi.search(query);
      return response.data as UserProfile[];
    },
  });

  // Add contact
  const addContactMutation = useMutation({
    mutationFn: async ({
      contactUserId,
      nickname,
    }: {
      contactUserId: string;
      nickname?: string;
    }) => {
      await contactsApi.add(contactUserId, nickname);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Update contact
  const updateContactMutation = useMutation({
    mutationFn: async ({
      contactUserId,
      data,
    }: {
      contactUserId: string;
      data: { nickname?: string; isFavorite?: boolean };
    }) => {
      await contactsApi.update(contactUserId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Remove contact
  const removeContactMutation = useMutation({
    mutationFn: async (contactUserId: string) => {
      await contactsApi.remove(contactUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Block user
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await usersApi.blockUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });

  // Unblock user
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await usersApi.unblockUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (contact: Contact) => {
      await updateContactMutation.mutateAsync({
        contactUserId: contact.contactUserId,
        data: { isFavorite: !contact.isFavorite },
      });
    },
    [updateContactMutation]
  );

  // Sort contacts alphabetically
  const sortedContacts = [...contacts].sort((a, b) => {
    const nameA = (a.nickname || a.displayName || a.fullName || '').toLowerCase();
    const nameB = (b.nickname || b.displayName || b.fullName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Group contacts by first letter
  const groupedContacts = sortedContacts.reduce((groups, contact) => {
    const name = contact.nickname || contact.displayName || contact.fullName || '';
    const letter = name.charAt(0).toUpperCase();

    if (!groups[letter]) {
      groups[letter] = [];
    }
    groups[letter].push(contact);
    return groups;
  }, {} as Record<string, Contact[]>);

  return {
    contacts: sortedContacts,
    groupedContacts,
    favorites,
    isLoading,
    isFavoritesLoading,
    isError,
    error,
    refetch,
    searchUsers: searchUsersMutation.mutateAsync,
    isSearching: searchUsersMutation.isPending,
    searchResults: searchUsersMutation.data,
    addContact: addContactMutation.mutate,
    isAdding: addContactMutation.isPending,
    updateContact: updateContactMutation.mutate,
    isUpdating: updateContactMutation.isPending,
    removeContact: removeContactMutation.mutate,
    isRemoving: removeContactMutation.isPending,
    blockUser: blockUserMutation.mutate,
    unblockUser: unblockUserMutation.mutate,
    toggleFavorite,
  };
};

export default useContacts;
