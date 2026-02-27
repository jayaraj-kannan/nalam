// Sync Service for background data synchronization
// Handles conflict resolution and sync status

import { offlineStorage, SyncQueueItem } from './OfflineStorageService';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingItems: number;
  error: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState = {
    status: 'idle',
    lastSyncTime: null,
    pendingItems: 0,
    error: null,
  };
  private syncInterval: number | null = null;
  private isSyncing = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[Sync] Back online, starting sync...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline');
      this.updateState({ status: 'idle' });
    });
  }

  // Start automatic sync (every 5 minutes when online)
  startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('[Sync] Auto-sync started');
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Auto-sync stopped');
    }
  }

  // Subscribe to sync state changes
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current sync state
  getState(): SyncState {
    return { ...this.state };
  }

  // Sync all queued items
  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Sync] Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('[Sync] Cannot sync while offline');
      return;
    }

    this.isSyncing = true;
    this.updateState({ status: 'syncing', error: null });

    try {
      const queue = await offlineStorage.getSyncQueue();
      this.updateState({ pendingItems: queue.length });

      console.log(`[Sync] Syncing ${queue.length} items...`);

      for (const item of queue) {
        try {
          await this.syncItem(item);
          await offlineStorage.removeFromSyncQueue(item.id!);
        } catch (error) {
          console.error('[Sync] Failed to sync item:', item, error);
          // Continue with next item
        }
      }

      this.updateState({
        status: 'success',
        lastSyncTime: new Date(),
        pendingItems: 0,
      });

      console.log('[Sync] Sync completed successfully');
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync a single item
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, payload } = item;

    switch (type) {
      case 'health-data':
        await this.syncHealthData(payload);
        break;
      case 'emergency-alert':
        await this.syncEmergencyAlert(payload);
        break;
      case 'medication-confirmation':
        await this.syncMedicationConfirmation(payload);
        break;
      default:
        console.warn('[Sync] Unknown sync type:', type);
    }
  }

  // Sync health data
  private async syncHealthData(data: any): Promise<void> {
    const response = await fetch('/api/v1/health/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync health data: ${response.statusText}`);
    }

    console.log('[Sync] Health data synced successfully');
  }

  // Sync emergency alert
  private async syncEmergencyAlert(alert: any): Promise<void> {
    const response = await fetch('/api/v1/health/emergency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync emergency alert: ${response.statusText}`);
    }

    console.log('[Sync] Emergency alert synced successfully');
  }

  // Sync medication confirmation
  private async syncMedicationConfirmation(data: any): Promise<void> {
    const response = await fetch('/api/v1/medications/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync medication confirmation: ${response.statusText}`);
    }

    console.log('[Sync] Medication confirmation synced successfully');
  }

  // Handle conflict resolution
  async resolveConflict(
    localData: any,
    serverData: any,
    strategy: 'local' | 'server' | 'merge' = 'server'
  ): Promise<any> {
    switch (strategy) {
      case 'local':
        // Keep local changes
        return localData;

      case 'server':
        // Use server data (default for healthcare to ensure accuracy)
        return serverData;

      case 'merge':
        // Merge both (use latest timestamp for each field)
        return this.mergeData(localData, serverData);

      default:
        return serverData;
    }
  }

  // Merge data based on timestamps
  private mergeData(local: any, server: any): any {
    const localTime = new Date(local.timestamp).getTime();
    const serverTime = new Date(server.timestamp).getTime();

    // For healthcare data, prefer server data to ensure accuracy
    // unless local data is significantly newer (> 1 hour)
    if (localTime - serverTime > 3600000) {
      return local;
    }

    return server;
  }

  // Get authentication token
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    // For now, return empty string
    return localStorage.getItem('authToken') || '';
  }

  // Update state and notify listeners
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Check if there are pending items to sync
  async hasPendingSync(): Promise<boolean> {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length > 0;
  }

  // Get pending sync count
  async getPendingCount(): Promise<number> {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length;
  }
}

// Export singleton instance
export const syncService = new SyncService();
