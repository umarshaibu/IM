import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation, children } from '@nozbe/watermelondb/decorators';
import Conversation from './Conversation';
import MessageReceipt from './MessageReceipt';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'missed_call' | 'missed_video_call' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export default class Message extends Model {
  static table = 'messages';

  static associations = {
    conversations: { type: 'belongs_to' as const, key: 'conversation_id' },
    message_receipts: { type: 'has_many' as const, foreignKey: 'message_id' },
  };

  @text('server_id') serverId!: string;
  @text('conversation_id') conversationId!: string;
  @text('sender_id') senderId!: string;
  @text('type') type!: MessageType;
  @text('content') content!: string | null;
  @text('media_url') mediaUrl!: string | null;
  @text('media_thumbnail_url') mediaThumbnailUrl!: string | null;
  @text('media_local_path') mediaLocalPath!: string | null;
  @text('media_mime_type') mediaMimeType!: string | null;
  @field('media_size') mediaSize!: number | null;
  @field('media_duration') mediaDuration!: number | null;
  @text('reply_to_id') replyToId!: string | null;
  @text('forwarded_from_id') forwardedFromId!: string | null;
  @text('status') status!: MessageStatus;
  @field('is_edited') isEdited!: boolean;
  @field('is_deleted') isDeleted!: boolean;
  @field('expires_at') expiresAt!: number | null;
  @text('metadata') metadata!: string | null; // JSON metadata for call info, etc.
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('conversations', 'conversation_id') conversation!: Conversation;
  @children('message_receipts') receipts!: Query<MessageReceipt>;

  // Check if message has media
  get hasMedia(): boolean {
    return ['image', 'video', 'audio', 'document'].includes(this.type);
  }

  // Check if media is cached locally
  get isMediaCached(): boolean {
    return !!this.mediaLocalPath;
  }

  // Check if message is a call-related message
  get isCallMessage(): boolean {
    return ['missed_call', 'missed_video_call'].includes(this.type);
  }

  // Check if message is a system message
  get isSystemMessage(): boolean {
    return this.type === 'system';
  }

  // Parse metadata as JSON
  get parsedMetadata(): Record<string, any> | null {
    if (!this.metadata) return null;
    try {
      return JSON.parse(this.metadata);
    } catch {
      return null;
    }
  }
}
