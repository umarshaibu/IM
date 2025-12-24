import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('contact_user_id') contactUserId!: string;
  @text('nickname') nickname!: string | null;
  @field('is_blocked') isBlocked!: boolean;
  @field('is_favorite') isFavorite!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
