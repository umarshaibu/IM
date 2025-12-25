import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { useAuthStore } from '../stores/authStore';
import { Message, Call, MessageReaction, DeleteType } from '../types';
import { AppConfig } from '../config';
import { callSoundService } from './CallSoundService';
import { NativeCallSound } from './NativeCallSound';
import { endNativeCall } from './NativeCallEvent';

// SignalR URL is now centralized in AppConfig
const API_URL = AppConfig.signalRUrl;

let chatConnection: HubConnection | null = null;
let callConnection: HubConnection | null = null;
let presenceConnection: HubConnection | null = null;

export const initializeSignalR = async (accessToken: string): Promise<void> => {
  // Clean up existing connections before reinitializing
  await disconnectSignalR();

  await Promise.all([
    initializeChatHub(accessToken),
    initializeCallHub(accessToken),
    initializePresenceHub(accessToken),
  ]);
};

export const disconnectSignalR = async (): Promise<void> => {
  await Promise.all([
    chatConnection?.stop(),
    callConnection?.stop(),
    presenceConnection?.stop(),
  ]);
  chatConnection = null;
  callConnection = null;
  presenceConnection = null;
};

// Chat Hub
const initializeChatHub = async (accessToken: string): Promise<void> => {
  chatConnection = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, {
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  // Connection lifecycle events
  chatConnection.onclose((error) => {
    console.log('=== CHAT HUB CONNECTION CLOSED ===');
    console.log('Error:', error?.message || 'No error message');
  });

  chatConnection.onreconnecting((error) => {
    console.log('=== CHAT HUB RECONNECTING ===');
    console.log('Error:', error?.message || 'No error message');
  });

  chatConnection.onreconnected((connectionId) => {
    console.log('=== CHAT HUB RECONNECTED ===');
    console.log('New connection ID:', connectionId);
  });

  // Event handlers
  chatConnection.on('ReceiveMessage', async (message: Message) => {
    try {
      // TODO: Decrypt the message content when proper E2E encryption is implemented
      // For now, messages are sent in plain text
      useChatStore.getState().addMessage(message.conversationId, message);
    } catch (error) {
      console.error('Error processing received message:', error);
      useChatStore.getState().addMessage(message.conversationId, message);
    }
  });

  chatConnection.on('MessageDelivered', (messageId: string, userId: string, timestamp: string) => {
    const { messages } = useChatStore.getState();
    Object.keys(messages).forEach((convId) => {
      const msg = messages[convId].find((m) => m.id === messageId);
      if (msg) {
        useChatStore.getState().updateMessage(convId, messageId, {
          statuses: msg.statuses.map((s) =>
            s.userId === userId ? { ...s, status: 'Delivered', deliveredAt: timestamp } : s
          ),
        });
      }
    });
  });

  chatConnection.on('MessageRead', (messageId: string, userId: string, timestamp: string) => {
    const { messages } = useChatStore.getState();
    Object.keys(messages).forEach((convId) => {
      const msg = messages[convId].find((m) => m.id === messageId);
      if (msg) {
        useChatStore.getState().updateMessage(convId, messageId, {
          statuses: msg.statuses.map((s) =>
            s.userId === userId ? { ...s, status: 'Read', readAt: timestamp } : s
          ),
        });
      }
    });
  });

  chatConnection.on('MessageDeleted', (messageId: string, userId: string) => {
    const { messages } = useChatStore.getState();
    Object.keys(messages).forEach((convId) => {
      useChatStore.getState().deleteMessage(convId, messageId);
    });
  });

  chatConnection.on('MessageEdited', (message: Message) => {
    useChatStore.getState().updateMessage(message.conversationId, message.id, message);
  });

  chatConnection.on('UserTyping', (conversationId: string, userId: string) => {
    useChatStore.getState().setUserTyping(conversationId, userId);
    // Auto-remove after 3 seconds
    setTimeout(() => {
      useChatStore.getState().removeUserTyping(conversationId, userId);
    }, 3000);
  });

  chatConnection.on('UserStopTyping', (conversationId: string, userId: string) => {
    useChatStore.getState().removeUserTyping(conversationId, userId);
  });

  chatConnection.on('UserOnline', (userId: string) => {
    useChatStore.getState().setUserOnline(userId);
  });

  chatConnection.on('UserOffline', (userId: string, lastSeen: string) => {
    useChatStore.getState().setUserOffline(userId);
  });

  chatConnection.on('MessageError', (error: string) => {
    console.error('Message error:', error);
  });

  // Push-to-Talk (PTT) event handlers
  chatConnection.on('PTTStarted', (conversationId: string, userId: string, userName: string) => {
    console.log(`PTT: ${userName} started speaking in conversation ${conversationId}`);
    useChatStore.getState().setPTTActive(conversationId, userId, userName);
  });

  chatConnection.on('PTTChunk', (conversationId: string, userId: string, audioChunkBase64: string) => {
    // Handle incoming audio chunk for real-time playback
    // This will be processed by the PTT player component
    useChatStore.getState().addPTTChunk(conversationId, userId, audioChunkBase64);
  });

  chatConnection.on('PTTEnded', (conversationId: string, userId: string, mediaUrl: string | null, duration: number) => {
    console.log(`PTT: User ${userId} ended speaking in conversation ${conversationId}, duration: ${duration}ms`);
    useChatStore.getState().clearPTTActive(conversationId, userId);
  });

  chatConnection.on('PTTCancelled', (conversationId: string, userId: string) => {
    console.log(`PTT: User ${userId} cancelled PTT in conversation ${conversationId}`);
    useChatStore.getState().clearPTTActive(conversationId, userId);
  });

  chatConnection.on('ConversationRead', (conversationId: string, userId: string, timestamp: string) => {
    // Update the unread count for the conversation
    useChatStore.getState().updateConversation(conversationId, { unreadCount: 0 });

    // Mark all messages in this conversation as read by this user
    const { messages } = useChatStore.getState();
    const conversationMessages = messages[conversationId] || [];
    conversationMessages.forEach((msg) => {
      if (msg.statuses) {
        useChatStore.getState().updateMessage(conversationId, msg.id, {
          statuses: msg.statuses.map((s) =>
            s.userId === userId ? { ...s, status: 'Read', readAt: timestamp } : s
          ),
        });
      }
    });
  });

  // Forward message events
  chatConnection.on('MessageForwarded', (originalMessageId: string, toConversationId: string, newMessageId: string) => {
    console.log(`Message ${originalMessageId} forwarded to ${toConversationId} as ${newMessageId}`);
  });

  chatConnection.on('MessagesForwarded', (originalMessageId: string, count: number) => {
    console.log(`Message ${originalMessageId} forwarded to ${count} conversations`);
  });

  chatConnection.on('ForwardError', (error: string) => {
    console.error('Forward error:', error);
  });

  // Reaction events
  chatConnection.on('ReactionAdded', (messageId: string, reaction: MessageReaction) => {
    const { messages } = useChatStore.getState();
    Object.keys(messages).forEach((convId) => {
      const msg = messages[convId].find((m) => m.id === messageId);
      if (msg) {
        const existingReactions = msg.reactions || [];
        useChatStore.getState().updateMessage(convId, messageId, {
          reactions: [...existingReactions, reaction],
        });
      }
    });
  });

  chatConnection.on('ReactionRemoved', (messageId: string, userId: string, emoji: string) => {
    const { messages } = useChatStore.getState();
    Object.keys(messages).forEach((convId) => {
      const msg = messages[convId].find((m) => m.id === messageId);
      if (msg && msg.reactions) {
        useChatStore.getState().updateMessage(convId, messageId, {
          reactions: msg.reactions.filter((r) => !(r.userId === userId && r.emoji === emoji)),
        });
      }
    });
  });

  chatConnection.on('ReactionError', (error: string) => {
    console.error('Reaction error:', error);
  });

  // Star/Bookmark events
  chatConnection.on('MessageStarred', (messageId: string, starredAt: string) => {
    console.log(`Message ${messageId} starred at ${starredAt}`);
  });

  chatConnection.on('MessageUnstarred', (messageId: string) => {
    console.log(`Message ${messageId} unstarred`);
  });

  chatConnection.on('StarError', (error: string) => {
    console.error('Star error:', error);
  });

  // Pin events
  chatConnection.on('MessagePinned', (pinnedMessage: any) => {
    console.log(`Message ${pinnedMessage.messageId} pinned in conversation ${pinnedMessage.conversationId}`);
  });

  chatConnection.on('MessageUnpinned', (conversationId: string, messageId: string, userId: string) => {
    console.log(`Message ${messageId} unpinned from conversation ${conversationId}`);
  });

  chatConnection.on('PinError', (error: string) => {
    console.error('Pin error:', error);
  });

  // Delete with audit events
  chatConnection.on('DeleteError', (error: string) => {
    console.error('Delete error:', error);
  });

  try {
    await chatConnection.start();
    console.log('Chat hub connected');
  } catch (error) {
    console.error('Error connecting to chat hub:', error);
  }
};

// Call Hub
const initializeCallHub = async (accessToken: string): Promise<void> => {
  callConnection = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/call`, {
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  // Connection lifecycle events
  callConnection.onclose((error) => {
    console.log('=== CALL HUB CONNECTION CLOSED ===');
    console.log('Error:', error?.message || 'No error message');
  });

  callConnection.onreconnecting((error) => {
    console.log('=== CALL HUB RECONNECTING ===');
    console.log('Error:', error?.message || 'No error message');
  });

  callConnection.onreconnected((connectionId) => {
    console.log('=== CALL HUB RECONNECTED ===');
    console.log('New connection ID:', connectionId);
  });

  callConnection.on('IncomingCall', (call: Call) => {
    console.log('=== INCOMING CALL RECEIVED ===');
    console.log('Call ID:', call.id);
    console.log('Initiator:', call.initiatorId, call.initiatorName);
    console.log('Type:', call.type);
    console.log('Conversation:', call.conversationId);
    console.log('Full call object:', JSON.stringify(call, null, 2));
    useCallStore.getState().setIncomingCall(call);
    console.log('Call set in store');
  });

  callConnection.on('UserJoinedCall', (callId: string, participant: any) => {
    const { activeCall } = useCallStore.getState();
    if (activeCall && activeCall.id === callId) {
      useCallStore.getState().setActiveCall({
        ...activeCall,
        participants: [...activeCall.participants, participant],
      });
    }
  });

  callConnection.on('UserLeftCall', (callId: string, userId: string) => {
    const { activeCall } = useCallStore.getState();
    if (activeCall && activeCall.id === callId) {
      useCallStore.getState().setActiveCall({
        ...activeCall,
        participants: activeCall.participants.filter((p) => p.userId !== userId),
      });
    }
  });

  callConnection.on('CallDeclined', (callId: string, declinedByUserId: string) => {
    console.log('=== CALL DECLINED EVENT RECEIVED ===');
    console.log('Call ID:', callId);
    console.log('Declined by user ID:', declinedByUserId);
    const { activeCall, incomingCall } = useCallStore.getState();
    const currentUserId = useAuthStore.getState().userId;

    // Stop all sounds (both JS and native)
    callSoundService.stopAllSounds();
    NativeCallSound.stopRingtone();

    // Close native incoming call activity if it's showing
    endNativeCall(callId);

    if (incomingCall?.id === callId) {
      useCallStore.getState().setIncomingCall(null);
    }

    if (activeCall?.id === callId) {
      // For 1-on-1 calls, if the other person declined, end the call for the caller
      if (currentUserId && declinedByUserId !== currentUserId) {
        // The other person declined, so end the call for the caller
        console.log('Other participant declined the call, ending call for caller');
        callSoundService.playBusyTone();
        useCallStore.getState().resetCallState();
      } else {
        useCallStore.getState().updateCallParticipant(declinedByUserId, { status: 'Declined' });
      }
    }
  });

  callConnection.on('CallEnded', (callId: string, userId: string) => {
    console.log('=== CALL ENDED EVENT RECEIVED ===');
    console.log('Call ID:', callId);
    console.log('Ended by user ID:', userId);
    const { activeCall, incomingCall } = useCallStore.getState();
    console.log('Current active call:', activeCall?.id);
    console.log('Current incoming call:', incomingCall?.id);

    // Stop all sounds (both JS and native) immediately
    callSoundService.stopAllSounds();
    NativeCallSound.stopRingtone();

    // Close native incoming call activity if it's showing
    endNativeCall(callId);

    if (activeCall?.id === callId || incomingCall?.id === callId) {
      console.log('Resetting call state...');
      callSoundService.playEndedTone();
      useCallStore.getState().resetCallState();
      console.log('Call state reset complete');
    } else {
      console.log('Call IDs do not match, not resetting state');
    }
  });

  callConnection.on('ParticipantStatusChanged', (callId: string, userId: string, status: any) => {
    useCallStore.getState().updateCallParticipant(userId, status);
  });

  callConnection.on('CallInvitation', (call: Call, invitedByName: string) => {
    console.log('=== CALL INVITATION RECEIVED ===');
    console.log('Call ID:', call.id);
    console.log('Invited by:', invitedByName);
    console.log('Type:', call.type);
    // Treat call invitation the same as incoming call
    useCallStore.getState().setIncomingCall(call);
  });

  callConnection.on('CallError', (error: string) => {
    console.error('Call error:', error);
  });

  try {
    await callConnection.start();
    console.log('Call hub connected');
  } catch (error) {
    console.error('Error connecting to call hub:', error);
  }
};

// Presence Hub
const initializePresenceHub = async (accessToken: string): Promise<void> => {
  presenceConnection = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/presence`, {
      accessTokenFactory: () => accessToken,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  // Connection lifecycle events
  presenceConnection.onclose((error) => {
    console.log('=== PRESENCE HUB CONNECTION CLOSED ===');
    console.log('Error:', error?.message || 'No error message');
  });

  presenceConnection.onreconnecting((error) => {
    console.log('=== PRESENCE HUB RECONNECTING ===');
    console.log('Error:', error?.message || 'No error message');
  });

  presenceConnection.onreconnected((connectionId) => {
    console.log('=== PRESENCE HUB RECONNECTED ===');
    console.log('New connection ID:', connectionId);
  });

  presenceConnection.on('ContactOnline', (userId: string) => {
    useChatStore.getState().setUserOnline(userId);
  });

  presenceConnection.on('ContactOffline', (userId: string, lastSeen: string) => {
    useChatStore.getState().setUserOffline(userId);
  });

  presenceConnection.on('OnlineContacts', (userIds: string[]) => {
    useChatStore.getState().setOnlineUsers(userIds);
  });

  presenceConnection.on('PresenceUpdate', (updates: Record<string, any>) => {
    Object.entries(updates).forEach(([userId, status]) => {
      if (status.IsOnline) {
        useChatStore.getState().setUserOnline(userId);
      } else {
        useChatStore.getState().setUserOffline(userId);
      }
    });
  });

  try {
    await presenceConnection.start();
    console.log('Presence hub connected');
  } catch (error) {
    console.error('Error connecting to presence hub:', error);
  }
};

// Chat Hub Methods
export const joinConversation = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('JoinConversation', conversationId);
  }
};

export const leaveConversation = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('LeaveConversation', conversationId);
  }
};

export const sendMessage = async (
  conversationId: string,
  message: {
    type: string;
    content?: string;
    mediaUrl?: string;
    metadata?: string;
    replyToMessageId?: string;
  }
): Promise<void> => {
  // Clean up the message object - remove undefined values
  const cleanMessage: Record<string, any> = {
    type: message.type,
  };

  if (message.content !== undefined) {
    cleanMessage.content = message.content;
  }
  if (message.mediaUrl !== undefined) {
    cleanMessage.mediaUrl = message.mediaUrl;
  }
  if (message.metadata !== undefined) {
    cleanMessage.metadata = message.metadata;
  }
  if (message.replyToMessageId !== undefined) {
    cleanMessage.replyToMessageId = message.replyToMessageId;
  }

  console.log('SignalR sendMessage called:', { conversationId, cleanMessage, state: chatConnection?.state });
  if (chatConnection?.state === HubConnectionState.Connected) {
    try {
      await chatConnection.invoke('SendMessage', conversationId, cleanMessage);
      console.log('Message sent successfully via SignalR');
    } catch (error) {
      console.error('Error sending message via SignalR:', error);
      throw error;
    }
  } else {
    console.warn('Chat connection not connected. State:', chatConnection?.state);
    throw new Error('Chat connection is not established');
  }
};

export const sendTyping = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('SendTyping', conversationId);
  }
};

export const sendStopTyping = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('SendStopTyping', conversationId);
  }
};

export const markMessageDelivered = async (messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('MarkMessageDelivered', messageId);
  }
};

export const markMessageRead = async (messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('MarkMessageRead', messageId);
  }
};

export const markConversationRead = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('MarkConversationRead', conversationId);
  }
};

export const deleteMessage = async (messageId: string, forEveryone: boolean): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('DeleteMessage', messageId, forEveryone);
  }
};

export const editMessage = async (messageId: string, newContent: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('EditMessage', messageId, newContent);
  }
};

// Push-to-Talk (PTT) Methods
export const startPTT = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('StartPTT', conversationId);
  }
};

export const sendPTTChunk = async (conversationId: string, audioChunkBase64: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('SendPTTChunk', conversationId, audioChunkBase64);
  }
};

export const endPTT = async (conversationId: string, mediaUrl: string | null, duration: number): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('EndPTT', conversationId, mediaUrl, duration);
  }
};

export const cancelPTT = async (conversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('CancelPTT', conversationId);
  }
};

// Call Hub Methods
export const initiateCall = async (
  conversationId: string,
  type: 'Voice' | 'Video'
): Promise<any> => {
  console.log('initiateCall called:', { conversationId, type, connectionState: callConnection?.state });
  if (callConnection?.state === HubConnectionState.Connected) {
    try {
      const result = await callConnection.invoke('InitiateCall', { conversationId, type });
      console.log('InitiateCall result:', result);
      return result;
    } catch (error) {
      console.error('InitiateCall error:', error);
      throw error;
    }
  }
  console.error('Call connection not connected, state:', callConnection?.state);
  return null;
};

export const joinCall = async (callId: string): Promise<any> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    return await callConnection.invoke('JoinCall', callId);
  }
  return null;
};

export const declineCall = async (callId: string): Promise<void> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    await callConnection.invoke('DeclineCall', callId);
  }
};

export const leaveCall = async (callId: string): Promise<void> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    await callConnection.invoke('LeaveCall', callId);
  }
};

export const endCall = async (callId: string): Promise<void> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    await callConnection.invoke('EndCall', callId);
  }
};

export const updateCallStatus = async (
  callId: string,
  status: { isMuted?: boolean; isVideoEnabled?: boolean }
): Promise<void> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    await callConnection.invoke('UpdateCallStatus', callId, status);
  }
};

export const inviteToCall = async (callId: string, userId: string): Promise<void> => {
  if (callConnection?.state === HubConnectionState.Connected) {
    await callConnection.invoke('InviteToCall', callId, userId);
  }
};

// Presence Hub Methods
export const requestPresence = async (userIds: string[]): Promise<void> => {
  if (presenceConnection?.state === HubConnectionState.Connected) {
    await presenceConnection.invoke('RequestPresence', userIds);
  }
};

export const ping = async (): Promise<void> => {
  if (presenceConnection?.state === HubConnectionState.Connected) {
    await presenceConnection.invoke('Ping');
  }
};

// Forward Message Methods
export const forwardMessage = async (messageId: string, toConversationId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('ForwardMessage', messageId, toConversationId);
  }
};

export const forwardMessageToMultiple = async (messageId: string, conversationIds: string[]): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('ForwardMessageToMultiple', messageId, conversationIds);
  }
};

// Enhanced Delete Methods
export const deleteMessageWithAudit = async (
  messageId: string,
  deleteType: 'ForMe' | 'ForEveryone' | 'AdminDelete',
  reason?: string
): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    // Convert string to enum value expected by backend
    const deleteTypeValue = deleteType === 'ForMe' ? 0 : deleteType === 'ForEveryone' ? 1 : 2;
    await chatConnection.invoke('DeleteMessageWithAudit', messageId, deleteTypeValue, reason || null);
  }
};

// Reaction Methods
export const addReaction = async (messageId: string, emoji: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('AddReaction', messageId, emoji);
  }
};

export const removeReaction = async (messageId: string, emoji: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('RemoveReaction', messageId, emoji);
  }
};

// Star/Bookmark Methods
export const starMessage = async (messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('StarMessage', messageId);
  }
};

export const unstarMessage = async (messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('UnstarMessage', messageId);
  }
};

// Pin Methods
export const pinMessage = async (conversationId: string, messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('PinMessage', conversationId, messageId);
  }
};

export const unpinMessage = async (conversationId: string, messageId: string): Promise<void> => {
  if (chatConnection?.state === HubConnectionState.Connected) {
    await chatConnection.invoke('UnpinMessage', conversationId, messageId);
  }
};

export {
  chatConnection,
  callConnection,
  presenceConnection,
};
