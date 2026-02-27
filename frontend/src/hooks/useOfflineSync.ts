// React hook for offline sync functionality

import { useState, useEffect } from 'react';
import { syncService, SyncState } from '../services/SyncService';

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = syncService.subscribe(setSyncState);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start auto-sync
    syncService.startAutoSync();

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.stopAutoSync();
    };
  }, []);

  const manualSync = async () => {
    await syncService.syncAll();
  };

  return {
    ...syncState,
    isOnline,
    manualSync,
  };
}
