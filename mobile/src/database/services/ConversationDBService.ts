import { Q } from '@nozbe/watermelondb';
import database from '../index';
import { Conversation, ConversationParticipant, User } from '../models';

interface ServerConversation {
  id: string;
  type: 'Direct' | 'Group';
  name: string | null;
  avatarUrl: string | null;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  participants: Array<{
    userId: string;
    role: string;
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

class ConversationDBService {
  private conversationsCollection = database.get<Conversation>('conversations');
  private participantsCollection = database.get<ConversationParticipant>('conversation_participants');

  /**
   * Get all conversations from local database
   */
  async getAllConversations(): Promise<Conversation[]> {
    try {
      return await this.conversationsCollection
        .query(Q.sortBy('last_message_at', Q.desc))
        .fetch();
    } catch (error) {
      console.error('Error fetching conversations from DB:', error);
      return [];
    }
  }

  /**
   * Get a conversation by server ID
   */
  async getConversationByServerId(serverId: string): Promise<Conversation | null> {
    try {
      const conversations = await this.conversationsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      return conversations[0] || null;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  /**
   * Sync conversations from server to local database
   */
  async syncConversations(serverConversations: ServerConversation[]): Promise<void> {
    try {
      await database.write(async () => {
        for (const serverConv of serverConversations) {
          const existing = await this.conversationsCollection
            .query(Q.where('server_id', serverConv.id))
            .fetch();

          if (existing.length > 0) {
            // Update existing conversation
            await existing[0].update(conv => {
              conv.name = serverConv.name;
              conv.avatarUrl = serverConv.avatarUrl;
              conv.lastMessageContent = serverConv.lastMessage?.content || null;
              conv.lastMessageAt = serverConv.lastMessage
                ? new Date(serverConv.lastMessage.createdAt).getTime()
                : null;
              conv.lastMessageSenderId = serverConv.lastMessage?.senderId || null;
              conv.unreadCount = serverConv.unreadCount;
              conv.isMuted = serverConv.isMuted;
              conv.isPinned = serverConv.isPinned;
            });
          } else {
            // Create new conversation
            await this.conversationsCollection.create(conv => {
              conv.serverId = serverConv.id;
              conv.type = serverConv.type.toLowerCase() as 'direct' | 'group';
              conv.name = serverConv.name;
              conv.avatarUrl = serverConv.avatarUrl;
              conv.lastMessageContent = serverConv.lastMessage?.content || null;
              conv.lastMessageAt = serverConv.lastMessage
                ? new Date(serverConv.lastMessage.createdAt).getTime()
                : null;
              conv.lastMessageSenderId = serverConv.lastMessage?.senderId || null;
              conv.unreadCount = serverConv.unreadCount;
              conv.isMuted = serverConv.isMuted;
              conv.isPinned = serverConv.isPinned;
            });
          }

          // Sync participants
          await this.syncParticipants(serverConv.id, serverConv.participants);
        }
      });
    } catch (error) {
      console.error('Error syncing conversations:', error);
      throw error;
    }
  }

  /**
   * Sync conversation participants
   */
  private async syncParticipants(
    conversationServerId: string,
    participants: ServerConversation['participants']
  ): Promise<void> {
    // Get local conversation ID
    const localConv = await this.conversationsCollection
      .query(Q.where('server_id', conversationServerId))
      .fetch();

    if (localConv.length === 0) return;

    const localConvId = localConv[0].id;

    // Delete existing participants
    const existingParticipants = await this.participantsCollection
      .query(Q.where('conversation_id', localConvId))
      .fetch();

    for (const p of existingParticipants) {
      await p.destroyPermanently();
    }

    // Create new participants
    for (const participant of participants) {
      await this.participantsCollection.create(p => {
        p.conversationId = localConvId;
        p.userId = participant.userId;
        p.role = participant.role;
        p.joinedAt = new Date(participant.joinedAt).getTime();
      });
    }
  }

  /**
   * Update conversation's last message
   */
  async updateLastMessage(
    conversationServerId: string,
    content: string,
    senderId: string,
    timestamp: Date
  ): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection
          .query(Q.where('server_id', conversationServerId))
          .fetch();

        if (conversations.length > 0) {
          await conversations[0].update(conv => {
            conv.lastMessageContent = content;
            conv.lastMessageSenderId = senderId;
            conv.lastMessageAt = timestamp.getTime();
          });
        }
      });
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }

  /**
   * Update unread count
   */
  async updateUnreadCount(conversationServerId: string, count: number): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection
          .query(Q.where('server_id', conversationServerId))
          .fetch();

        if (conversations.length > 0) {
          await conversations[0].update(conv => {
            conv.unreadCount = count;
          });
        }
      });
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  }

  /**
   * Mark conversation as read (reset unread count)
   */
  async markAsRead(conversationServerId: string): Promise<void> {
    await this.updateUnreadCount(conversationServerId, 0);
  }

  /**
   * Increment unread count
   */
  async incrementUnreadCount(conversationServerId: string): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection
          .query(Q.where('server_id', conversationServerId))
          .fetch();

        if (conversations.length > 0) {
          await conversations[0].update(conv => {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          });
        }
      });
    } catch (error) {
      console.error('Error incrementing unread count:', error);
    }
  }

  /**
   * Soft delete a conversation (marks as deleted without removing from DB)
   */
  async softDeleteConversation(conversationServerId: string): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection
          .query(Q.where('server_id', conversationServerId))
          .fetch();

        if (conversations.length > 0) {
          await conversations[0].update(conv => {
            conv.isDeleted = true;
            conv.deletedAt = Date.now();
          });
        }
      });
    } catch (error) {
      console.error('Error soft deleting conversation:', error);
    }
  }

  /**
   * Restore a soft-deleted conversation
   */
  async restoreConversation(conversationServerId: string): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection
          .query(Q.where('server_id', conversationServerId))
          .fetch();

        if (conversations.length > 0) {
          await conversations[0].update(conv => {
            conv.isDeleted = false;
            conv.deletedAt = null;
          });
        }
      });
    } catch (error) {
      console.error('Error restoring conversation:', error);
    }
  }

  /**
   * Get all non-deleted conversations
   */
  async getActiveConversations(): Promise<Conversation[]> {
    try {
      return await this.conversationsCollection
        .query(
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('last_message_at', Q.desc)
        )
        .fetch();
    } catch (error) {
      console.error('Error fetching active conversations from DB:', error);
      return [];
    }
  }

  /**
   * Clear all conversations (for logout)
   */
  async clearAll(): Promise<void> {
    try {
      await database.write(async () => {
        const conversations = await this.conversationsCollection.query().fetch();
        const participants = await this.participantsCollection.query().fetch();

        for (const p of participants) {
          await p.destroyPermanently();
        }

        for (const c of conversations) {
          await c.destroyPermanently();
        }
      });
    } catch (error) {
      console.error('Error clearing conversations:', error);
    }
  }
}

export const conversationDBService = new ConversationDBService();
export default conversationDBService;
