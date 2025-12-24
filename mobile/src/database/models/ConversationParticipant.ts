import { Model } from '@nozbe/watermelondb';
import { field, date, text, relation } from '@nozbe/watermelondb/decorators';
import Conversation from './Conversation';
import User from './User';

export default class ConversationParticipant extends Model {
  static table = 'conversation_participants';

  static associations = {
    conversations: { type: 'belongs_to' as const, key: 'conversation_id' },
  };

  @text('conversation_id') conversationId!: string;
  @text('user_id') userId!: string;
  @text('role') role!: string | null;
  @field('joined_at') joinedAt!: number;

  @relation('conversations', 'conversation_id') conversation!: Conversation;
}
