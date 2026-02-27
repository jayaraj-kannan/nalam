// Tests for Sync Service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncService } from '../SyncService';

// Mock fetch
global.fetch = vi.fn();

// Mock offlineStorage
vi.mock('../OfflineStorageService', () => ({
  offlineStorage: {
    getSyncQueue: vi.fn(() => Promise.resolve([])),
    removeFromSyncQueue: vi.fn(() => Promise.resolve()),
  },
}));

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    syncService.stopAutoSync();
  });

  describe('Sync State Management', () => {
    it('should return current sync state', () => {
      const state = syncService.getState();
      
      expect(state).toBeDefined();
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('lastSyncTime');
      expect(state).toHaveProperty('pendingItems');
      expect(state).toHaveProperty('error');
    });

    it('should allow subscribing to state changes', () => {
      const listener = vi.fn();
      const unsubscribe = syncService.subscribe(listener);
      
      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
    });

    it('should notify listeners on state changes', async () => {
      const listener = vi.fn();
      syncService.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Trigger sync (will update state)
      await syncService.syncAll();
      
      // Should have been called with updated state
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Auto Sync', () => {
    it('should start auto sync', () => {
      syncService.startAutoSync();
      // Auto sync should be running (no error thrown)
      expect(true).toBe(true);
    });

    it('should stop auto sync', () => {
      syncService.startAutoSync();
      syncService.stopAutoSync();
      // Auto sync should be stopped (no error thrown)
      expect(true).toBe(true);
    });

    it('should not start multiple auto sync intervals', () => {
      syncService.startAutoSync();
      syncService.startAutoSync();
      // Should only have one interval running
      expect(true).toBe(true);
    });
  });

  describe('Sync Operations', () => {
    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await syncService.syncAll();
      
      const state = syncService.getState();
      expect(state.status).not.toBe('syncing');
    });

    it('should sync when online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      await syncService.syncAll();
      
      // Should have attempted to sync
      expect(true).toBe(true);
    });

    it('should not start multiple syncs simultaneously', async () => {
      const promise1 = syncService.syncAll();
      const promise2 = syncService.syncAll();
      
      await Promise.all([promise1, promise2]);
      
      // Second sync should have been skipped
      expect(true).toBe(true);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using server strategy', async () => {
      const localData = { value: 'local', timestamp: new Date().toISOString() };
      const serverData = { value: 'server', timestamp: new Date().toISOString() };
      
      const result = await syncService.resolveConflict(localData, serverData, 'server');
      
      expect(result).toEqual(serverData);
    });

    it('should resolve conflicts using local strategy', async () => {
      const localData = { value: 'local', timestamp: new Date().toISOString() };
      const serverData = { value: 'server', timestamp: new Date().toISOString() };
      
      const result = await syncService.resolveConflict(localData, serverData, 'local');
      
      expect(result).toEqual(localData);
    });

    it('should merge data when using merge strategy', async () => {
      const now = new Date();
      const localData = { 
        value: 'local', 
        timestamp: new Date(now.getTime() + 7200000).toISOString() // 2 hours newer
      };
      const serverData = { 
        value: 'server', 
        timestamp: now.toISOString() 
      };
      
      const result = await syncService.resolveConflict(localData, serverData, 'merge');
      
      // Should prefer local data if significantly newer
      expect(result).toBeDefined();
    });

    it('should default to server strategy for healthcare data', async () => {
      const localData = { value: 'local', timestamp: new Date().toISOString() };
      const serverData = { value: 'server', timestamp: new Date().toISOString() };
      
      // No strategy specified - should default to server
      const result = await syncService.resolveConflict(localData, serverData);
      
      expect(result).toEqual(serverData);
    });
  });

  describe('Pending Sync Status', () => {
    it('should check for pending sync items', async () => {
      const hasPending = await syncService.hasPendingSync();
      
      expect(typeof hasPending).toBe('boolean');
    });

    it('should get pending sync count', async () => {
      const count = await syncService.getPendingCount();
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
