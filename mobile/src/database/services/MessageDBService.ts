import { Q } from '@nozbe/watermelondb';
import database from '../index';
import { Message, SyncQueue } from '../models';
import { MessageType, MessageStatus } from '../models/Message';

interface ServerMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  duration: number | null;
  replyToId: string | null;
  forwardedFromId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class MessageDBService {
  private messagesCollection = database.get<Message>('messages');
  private syncQueueCollection = database.get<SyncQueue>('sync_queue');

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationServerId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // First, get messages by conversation server ID
      return await this.messagesCollection
        .query(
          Q.where('conversation_id', conversationServerId),
          Q.sortBy('created_at', Q.desc),
          Q.skip(offset),
          Q.take(limit)
        )
        .fetch();
    } catch (error) {
      console.error('Error fetching messages from DB:', error);
      return [];
    }
  }

  /**
   * Get a message by server ID
   */
  async getMessageByServerId(serverId: string): Promise<Message | null> {
    try {
      const messages = await this.messagesCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      return messages[0] || null;
    } catch (error) {
      console.error('Error fetching message:', error);
      return null;
    }
  }

  /**
   * Sync messages from server to local database
   */
  async syncMessages(conversationServerId: string, serverMessages: ServerMessage[]): Promise<void> {
    try {
      await database.write(async () => {
        for (const serverMsg of serverMessages) {
          const existing = await this.messagesCollection
            .query(Q.where('server_id', serverMsg.id))
            .fetch();

          if (existing.length > 0) {
            // Update existing message
            await existing[0].update(msg => {
              msg.content = serverMsg.content;
              msg.isEdited = serverMsg.isEdited;
              msg.isDeleted = serverMsg.isDeleted;
              msg.status = 'sent';
            });
          } else {
            // Create new message
            await this.messagesCollection.create(msg => {
              msg.serverId = serverMsg.id;
              msg.conversationId = serverMsg.conversationId;
              msg.senderId = serverMsg.senderId;
              msg.type = serverMsg.type.toLowerCase() as MessageType;
              msg.content = serverMsg.content;
              msg.mediaUrl = serverMsg.mediaUrl;
              msg.mediaThumbnailUrl = serverMsg.thumbnailUrl;
              msg.mediaMimeType = serverMsg.mimeType;
              msg.mediaSize = serverMsg.fileSize;
              msg.mediaDuration = serverMsg.duration;
              msg.replyToId = serverMsg.replyToId;
              msg.forwardedFromId = serverMsg.forwardedFromId;
              msg.status = 'sent';
              msg.isEdited = serverMsg.isEdited;
              msg.isDeleted = serverMsg.isDeleted;
              msg.expiresAt = serverMsg.expiresAt
                ? new Date(serverMsg.expiresAt).getTime()
                : null;
            });
          }
        }
      });
    } catch (error) {
      console.error('Error syncing messages:', error);
      throw error;
    }
  }

  /**
   * Save a message locally (for sending while offline)
   */
  async saveLocalMessage(
    conversationServerId: string,
    senderId: string,
    type: MessageType,
    content: string | null,
    mediaUrl?: string,
    mediaLocalPath?: string,
    mediaMimeType?: string,
    mediaSize?: number,
    mediaDuration?: number,
    replyToId?: string
  ): Promise<Message> {
    try {
      let newMessage: Message | null = null;

      await database.write(async () => {
        // Generate a temporary local ID
        const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        newMessage = await this.messagesCollection.create(msg => {
          msg.serverId = tempId;
          msg.conversationId = conversationServerId;
          msg.senderId = senderId;
          msg.type = type;
          msg.content = content;
          msg.mediaUrl = mediaUrl || null;
          msg.mediaLocalPath = mediaLocalPath || null;
          msg.mediaMimeType = mediaMimeType || null;
          msg.mediaSize = mediaSize || null;
          msg.mediaDuration = mediaDuration || null;
          msg.replyToId = replyToId || null;
          msg.forwardedFromId = null;
          msg.status = 'sending';
          msg.isEdited = false;
          msg.isDeleted = false;
          msg.expiresAt = null;
        });

        // Add to sync queue
        await this.syncQueueCollection.create(item => {
          item.entityType = 'message';
          item.entityId = newMessage!.id;
          item.action = 'create';
          item.payload = JSON.stringify({
            conversationId: conversationServerId,
            type,
            content,
            mediaUrl,
            replyToId,
          });
          item.retryCount = 0;
          item.lastRetryAt = null;
        });
      });

      return newMessage!;
    } catch (error) {
      console.error('Error saving local message:', error);
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    serverId: string,
    status: MessageStatus,
    newServerId?: string
  ): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('server_id', serverId))
          .fetch();

        if (messages.length > 0) {
          await messages[0].update(msg => {
            msg.status = status;
            if (newServerId) {
              msg.serverId = newServerId;
            }
          });
        }
      });
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }

  /**
   * Update message with server response (after successful send)
   */
  async updateMessageFromServer(localId: string, serverMessage: ServerMessage): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('server_id', localId))
          .fetch();

        if (messages.length > 0) {
          await messages[0].update(msg => {
            msg.serverId = serverMessage.id;
            msg.status = 'sent';
            msg.mediaUrl = serverMessage.mediaUrl;
            msg.mediaThumbnailUrl = serverMessage.thumbnailUrl;
          });
        }

        // Remove from sync queue
        const syncItems = await this.syncQueueCollection
          .query(
            Q.where('entity_type', 'message'),
            Q.where('entity_id', localId)
          )
          .fetch();

        for (const item of syncItems) {
          await item.destroyPermanently();
        }
      });
    } catch (error) {
      console.error('Error updating message from server:', error);
    }
  }

  /**
   * Mark message as edited
   */
  async markAsEdited(serverId: string, newContent: string): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('server_id', serverId))
          .fetch();

        if (messages.length > 0) {
          await messages[0].update(msg => {
            msg.content = newContent;
            msg.isEdited = true;
          });
        }
      });
    } catch (error) {
      console.error('Error marking message as edited:', error);
    }
  }

  /**
   * Mark message as deleted
   */
  async markAsDeleted(serverId: string): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('server_id', serverId))
          .fetch();

        if (messages.length > 0) {
          await messages[0].update(msg => {
            msg.isDeleted = true;
            msg.content = null;
          });
        }
      });
    } catch (error) {
      console.error('Error marking message as deleted:', error);
    }
  }

  /**
   * Update local media path (after caching)
   */
  async updateMediaLocalPath(serverId: string, localPath: string): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('server_id', serverId))
          .fetch();

        if (messages.length > 0) {
          await messages[0].update(msg => {
            msg.mediaLocalPath = localPath;
          });
        }
      });
    } catch (error) {
      console.error('Error updating media local path:', error);
    }
  }

  /**
   * Get pending messages from sync queue
   */
  async getPendingMessages(): Promise<SyncQueue[]> {
    try {
      return await this.syncQueueCollection
        .query(
          Q.where('entity_type', 'message'),
          Q.sortBy('created_at', Q.asc)
        )
        .fetch();
    } catch (error) {
      console.error('Error fetching pending messages:', error);
      return [];
    }
  }

  /**
   * Clear all messages for a conversation
   */
  async clearConversationMessages(conversationServerId: string): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection
          .query(Q.where('conversation_id', conversationServerId))
          .fetch();

        for (const msg of messages) {
          await msg.destroyPermanently();
        }
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }

  /**
   * Clear all messages (for logout)
   */
  async clearAll(): Promise<void> {
    try {
      await database.write(async () => {
        const messages = await this.messagesCollection.query().fetch();
        const syncQueue = await this.syncQueueCollection
          .query(Q.where('entity_type', 'message'))
          .fetch();

        for (const item of syncQueue) {
          await item.destroyPermanently();
        }

        for (const msg of messages) {
          await msg.destroyPermanently();
        }
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }
}

export const messageDBService = new MessageDBService();
export default messageDBService;
