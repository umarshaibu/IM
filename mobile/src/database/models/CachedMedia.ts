import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class CachedMedia extends Model {
  static table = 'cached_media';

  @text('url') url!: string;
  @text('local_path') localPath!: string;
  @text('mime_type') mimeType!: string | null;
  @field('size') size!: number;
  @field('cached_at') cachedAt!: number;
  @field('last_accessed_at') lastAccessedAt!: number;
}
