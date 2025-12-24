import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncEntityType = 'message' | 'read_receipt' | 'conversation' | 'contact';

export default class SyncQueue extends Model {
  static table = 'sync_queue';

  @text('entity_type') entityType!: SyncEntityType;
  @text('entity_id') entityId!: string;
  @text('action') action!: SyncAction;
  @text('payload') payload!: string; // JSON string
  @field('retry_count') retryCount!: number;
  @field('last_retry_at') lastRetryAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;

  // Parse the JSON payload
  get parsedPayload(): any {
    try {
      return JSON.parse(this.payload);
    } catch {
      return null;
    }
  }
}
