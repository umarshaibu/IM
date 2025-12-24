import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @text('server_id') serverId!: string;
  @text('username') username!: string;
  @text('display_name') displayName!: string | null;
  @text('avatar_url') avatarUrl!: string | null;
  @text('phone_number') phoneNumber!: string | null;
  @text('email') email!: string | null;
  @text('status') status!: string | null;
  @field('last_seen_at') lastSeenAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper to get display name or username
  get name(): string {
    return this.displayName || this.username;
  }
}
