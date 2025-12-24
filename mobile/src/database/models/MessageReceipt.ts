import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';
import Message from './Message';

export default class MessageReceipt extends Model {
  static table = 'message_receipts';

  static associations = {
    messages: { type: 'belongs_to' as const, key: 'message_id' },
  };

  @text('message_id') messageId!: string;
  @text('user_id') userId!: string;
  @field('read_at') readAt!: number;

  @relation('messages', 'message_id') message!: Message;
}
