import { Q } from '@nozbe/watermelondb';
import RNFS from 'react-native-fs';
import database from '../index';
import { CachedMedia } from '../models';
import { messageDBService } from './MessageDBService';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/media_cache`;
const MAX_CACHE_SIZE_MB = 500; // 500 MB max cache size
const MAX_CACHE_AGE_DAYS = 30; // Delete files older than 30 days

class MediaCacheService {
  private cachedMediaCollection = database.get<CachedMedia>('cached_media');
  private isInitialized = false;

  /**
   * Initialize the cache directory
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const exists = await RNFS.exists(CACHE_DIR);
      if (!exists) {
        await RNFS.mkdir(CACHE_DIR);
      }
      this.isInitialized = true;
      console.log('Media cache initialized at:', CACHE_DIR);
    } catch (error) {
      console.error('Error initializing media cache:', error);
    }
  }

  /**
   * Get cached file path for a URL
   */
  async getCachedPath(url: string): Promise<string | null> {
    try {
      const cached = await this.cachedMediaCollection
        .query(Q.where('url', url))
        .fetch();

      if (cached.length > 0) {
        const localPath = cached[0].localPath;
        // Verify file still exists
        const exists = await RNFS.exists(localPath);
        if (exists) {
          // Update last accessed time
          await database.write(async () => {
            await cached[0].update(c => {
              c.lastAccessedAt = Date.now();
            });
          });
          return localPath;
        } else {
          // File doesn't exist, remove from DB
          await database.write(async () => {
            await cached[0].destroyPermanently();
          });
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached path:', error);
      return null;
    }
  }

  /**
   * Download and cache a file
   */
  async cacheFile(
    url: string,
    messageServerId?: string,
    progressCallback?: (progress: number) => void
  ): Promise<string | null> {
    await this.initialize();

    // Check if already cached
    const existingPath = await this.getCachedPath(url);
    if (existingPath) {
      return existingPath;
    }

    try {
      // Generate a unique filename
      const extension = this.getExtensionFromUrl(url);
      const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
      const localPath = `${CACHE_DIR}/${filename}`;

      // Download the file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
        progress: (res) => {
          const progress = res.bytesWritten / res.contentLength;
          if (progressCallback) {
            progressCallback(progress);
          }
        },
        progressDivider: 10,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        console.error('Download failed with status:', downloadResult.statusCode);
        return null;
      }

      // Get file info
      const stat = await RNFS.stat(localPath);

      // Save to database
      await database.write(async () => {
        await this.cachedMediaCollection.create(c => {
          c.url = url;
          c.localPath = localPath;
          c.mimeType = this.getMimeTypeFromExtension(extension);
          c.size = parseInt(stat.size.toString(), 10);
          c.cachedAt = Date.now();
          c.lastAccessedAt = Date.now();
        });
      });

      // Update message with local path if messageServerId provided
      if (messageServerId) {
        await messageDBService.updateMediaLocalPath(messageServerId, localPath);
      }

      console.log('File cached successfully:', localPath);
      return localPath;
    } catch (error) {
      console.error('Error caching file:', error);
      return null;
    }
  }

  /**
   * Remove a cached file
   */
  async removeFromCache(url: string): Promise<void> {
    try {
      const cached = await this.cachedMediaCollection
        .query(Q.where('url', url))
        .fetch();

      if (cached.length > 0) {
        const localPath = cached[0].localPath;

        // Delete file
        const exists = await RNFS.exists(localPath);
        if (exists) {
          await RNFS.unlink(localPath);
        }

        // Remove from database
        await database.write(async () => {
          await cached[0].destroyPermanently();
        });
      }
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  /**
   * Clean up old cached files
   */
  async cleanupOldFiles(): Promise<void> {
    const maxAgeMs = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    try {
      const oldFiles = await this.cachedMediaCollection
        .query(Q.where('last_accessed_at', Q.lt(cutoffTime)))
        .fetch();

      console.log(`Found ${oldFiles.length} old cached files to clean up`);

      for (const file of oldFiles) {
        try {
          const exists = await RNFS.exists(file.localPath);
          if (exists) {
            await RNFS.unlink(file.localPath);
          }
          await database.write(async () => {
            await file.destroyPermanently();
          });
        } catch (error) {
          console.error('Error cleaning up file:', file.localPath, error);
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  /**
   * Get total cache size
   */
  async getCacheSize(): Promise<number> {
    try {
      const allCached = await this.cachedMediaCollection.query().fetch();
      return allCached.reduce((total, file) => total + file.size, 0);
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    try {
      // Delete all files
      const exists = await RNFS.exists(CACHE_DIR);
      if (exists) {
        await RNFS.unlink(CACHE_DIR);
        await RNFS.mkdir(CACHE_DIR);
      }

      // Clear database
      await database.write(async () => {
        const allCached = await this.cachedMediaCollection.query().fetch();
        for (const file of allCached) {
          await file.destroyPermanently();
        }
      });

      console.log('Media cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const urlPath = new URL(url).pathname;
      const match = urlPath.match(/\.[a-zA-Z0-9]+$/);
      return match ? match[0] : '';
    } catch {
      return '';
    }
  }

  /**
   * Get MIME type from extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export const mediaCacheService = new MediaCacheService();
export default mediaCacheService;
