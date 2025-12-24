import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Users table - stores user profiles
    tableSchema({
      name: 'users',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // UUID from server
        { name: 'username', type: 'string' },
        { name: 'display_name', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'phone_number', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isOptional: true }, // online, offline, away
        { name: 'last_seen_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Conversations table
    tableSchema({
      name: 'conversations',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // UUID from server
        { name: 'type', type: 'string' }, // 'direct' or 'group'
        { name: 'name', type: 'string', isOptional: true }, // for group chats
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'last_message_content', type: 'string', isOptional: true },
        { name: 'last_message_at', type: 'number', isOptional: true },
        { name: 'last_message_sender_id', type: 'string', isOptional: true },
        { name: 'unread_count', type: 'number' },
        { name: 'is_muted', type: 'boolean' },
        { name: 'is_pinned', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Conversation participants (for group chats and direct messages)
    tableSchema({
      name: 'conversation_participants',
      columns: [
        { name: 'conversation_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string', isOptional: true }, // admin, member
        { name: 'joined_at', type: 'number' },
      ],
    }),

    // Messages table
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // UUID from server
        { name: 'conversation_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // text, image, video, audio, document, location, etc.
        { name: 'content', type: 'string', isOptional: true },
        { name: 'media_url', type: 'string', isOptional: true },
        { name: 'media_thumbnail_url', type: 'string', isOptional: true },
        { name: 'media_local_path', type: 'string', isOptional: true }, // cached file path
        { name: 'media_mime_type', type: 'string', isOptional: true },
        { name: 'media_size', type: 'number', isOptional: true },
        { name: 'media_duration', type: 'number', isOptional: true }, // for audio/video
        { name: 'reply_to_id', type: 'string', isOptional: true },
        { name: 'forwarded_from_id', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // sending, sent, delivered, read, failed
        { name: 'is_edited', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'expires_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Message read receipts
    tableSchema({
      name: 'message_receipts',
      columns: [
        { name: 'message_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'read_at', type: 'number' },
      ],
    }),

    // Contacts table
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'contact_user_id', type: 'string', isIndexed: true },
        { name: 'nickname', type: 'string', isOptional: true },
        { name: 'is_blocked', type: 'boolean' },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // Cached media files
    tableSchema({
      name: 'cached_media',
      columns: [
        { name: 'url', type: 'string', isIndexed: true },
        { name: 'local_path', type: 'string' },
        { name: 'mime_type', type: 'string', isOptional: true },
        { name: 'size', type: 'number' },
        { name: 'cached_at', type: 'number' },
        { name: 'last_accessed_at', type: 'number' },
      ],
    }),

    // Pending sync queue - for messages sent while offline
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string' }, // message, read_receipt, etc.
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'action', type: 'string' }, // create, update, delete
        { name: 'payload', type: 'string' }, // JSON payload
        { name: 'retry_count', type: 'number' },
        { name: 'last_retry_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
