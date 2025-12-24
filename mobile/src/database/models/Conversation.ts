import { Model, Query, Q } from '@nozbe/watermelondb';
import { field, date, readonly, text, children, lazy } from '@nozbe/watermelondb/decorators';
import Message from './Message';
import ConversationParticipant from './ConversationParticipant';

export default class Conversation extends Model {
  static table = 'conversations';

  static associations = {
    messages: { type: 'has_many' as const, foreignKey: 'conversation_id' },
    conversation_participants: { type: 'has_many' as const, foreignKey: 'conversation_id' },
  };

  @text('server_id') serverId!: string;
  @text('type') type!: 'direct' | 'group';
  @text('name') name!: string | null;
  @text('avatar_url') avatarUrl!: string | null;
  @text('last_message_content') lastMessageContent!: string | null;
  @field('last_message_at') lastMessageAt!: number | null;
  @text('last_message_sender_id') lastMessageSenderId!: string | null;
  @field('unread_count') unreadCount!: number;
  @field('is_muted') isMuted!: boolean;
  @field('is_pinned') isPinned!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('messages') messages!: Query<Message>;
  @children('conversation_participants') participants!: Query<ConversationParticipant>;

  // Get recent messages
  @lazy
  recentMessages = this.messages.extend(
    Q.sortBy('created_at', Q.desc),
    Q.take(50)
  );
}
