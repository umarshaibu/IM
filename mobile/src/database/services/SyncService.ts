import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { conversationDBService } from './ConversationDBService';
import { messageDBService } from './MessageDBService';
import { userDBService } from './UserDBService';
import { conversationsApi } from '../../services/api';
import * as signalr from '../../services/signalr';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncEventListener {
  (status: SyncStatus, progress?: number): void;
}

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncListeners: Set<SyncEventListener> = new Set();
  private pendingSyncTimeout: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private readonly SYNC_DEBOUNCE_MS = 5000; // 5 seconds

  constructor() {
    // Listen for network state changes
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;

    console.log('Network state changed:', this.isOnline ? 'online' : 'offline');

    // If we came back online, trigger sync
    if (!wasOnline && this.isOnline) {
      this.schedulSync();
    }

    if (!this.isOnline) {
      this.notifyListeners('offline');
    }
  }

  /**
   * Add a sync status listener
   */
  addListener(listener: SyncEventListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus, progress?: number): void {
    this.syncListeners.forEach(listener => listener(status, progress));
  }

  /**
   * Check if we're online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Schedule a sync with debounce
   */
  schedulSync(): void {
    if (this.pendingSyncTimeout) {
      clearTimeout(this.pendingSyncTimeout);
    }

    this.pendingSyncTimeout = setTimeout(() => {
      this.syncAll();
    }, this.SYNC_DEBOUNCE_MS);
  }

  /**
   * Full sync - conversations and recent messages
   */
  async syncAll(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('syncing', 0);

    try {
      // Step 1: Sync pending outgoing messages first
      await this.syncPendingMessages();
      this.notifyListeners('syncing', 25);

      // Step 2: Sync conversations
      await this.syncConversations();
      this.notifyListeners('syncing', 50);

      // Step 3: Sync recent messages for each conversation
      // (Done automatically when conversation is opened)

      this.lastSyncTime = Date.now();
      this.notifyListeners('idle');
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('error');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync pending outgoing messages
   */
  async syncPendingMessages(): Promise<void> {
    if (!this.isOnline) return;

    const pendingItems = await messageDBService.getPendingMessages();
    console.log(`Found ${pendingItems.length} pending messages to sync`);

    for (const item of pendingItems) {
      try {
        const payload = item.parsedPayload;
        if (!payload) continue;

        // Try to send the message via SignalR
        await signalr.sendMessage(payload.conversationId, {
          type: payload.type || 'Text',
          content: payload.content,
          replyToMessageId: payload.replyToId,
        });

        // Mark as synced - the actual message update will come via SignalR callback
        await messageDBService.updateMessageStatus(item.entityId, 'sent');
        console.log('Message synced successfully:', item.entityId);
      } catch (error) {
        console.error('Failed to sync pending message:', error);
        // Update retry count in sync queue
        // The message will be retried on next sync
      }
    }
  }

  /**
   * Sync conversations from server
   */
  async syncConversations(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const response = await conversationsApi.getAll();
      if (response.data) {
        await conversationDBService.syncConversations(response.data);
        console.log(`Synced ${response.data.length} conversations`);
      }
    } catch (error) {
      console.error('Failed to sync conversations:', error);
      throw error;
    }
  }

  /**
   * Sync messages for a specific conversation
   */
  async syncConversationMessages(conversationServerId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      const response = await conversationsApi.getMessages(conversationServerId);
      if (response.data) {
        await messageDBService.syncMessages(conversationServerId, response.data);
        console.log(`Synced ${response.data.length} messages for conversation ${conversationServerId}`);
      }
    } catch (error) {
      console.error('Failed to sync messages:', error);
      throw error;
    }
  }

  /**
   * Clear all cached data (for logout)
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      conversationDBService.clearAll(),
      messageDBService.clearAll(),
      userDBService.clearAll(),
    ]);
    console.log('All local data cleared');
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }
}

export const syncService = new SyncService();
export default syncService;
