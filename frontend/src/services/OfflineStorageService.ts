// Offline Storage Service using IndexedDB
// Provides local storage for health data with background sync

export interface HealthDataRecord {
  id?: number;
  userId: string;
  type: 'vitals' | 'medication' | 'appointment' | 'alert';
  data: any;
  timestamp: string;
  synced: boolean;
  syncAttempts: number;
}

export interface SyncQueueItem {
  id?: number;
  type: string;
  payload: any;
  timestamp: string;
  attempts: number;
}

const DB_NAME = 'HealthcareMonitoringDB';
const DB_VERSION = 1;

class OfflineStorageService {
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Health data store
        if (!db.objectStoreNames.contains('healthData')) {
          const healthStore = db.createObjectStore('healthData', {
            keyPath: 'id',
            autoIncrement: true,
          });
          healthStore.createIndex('userId', 'userId', { unique: false });
          healthStore.createIndex('type', 'type', { unique: false });
          healthStore.createIndex('timestamp', 'timestamp', { unique: false });
          healthStore.createIndex('synced', 'synced', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Emergency contacts store (for offline access)
        if (!db.objectStoreNames.contains('emergencyContacts')) {
          const contactsStore = db.createObjectStore('emergencyContacts', {
            keyPath: 'id',
            autoIncrement: true,
          });
          contactsStore.createIndex('userId', 'userId', { unique: false });
        }

        // Medications store (for offline access)
        if (!db.objectStoreNames.contains('medications')) {
          const medsStore = db.createObjectStore('medications', {
            keyPath: 'id',
          });
          medsStore.createIndex('userId', 'userId', { unique: false });
        }

        // Appointments store (for offline access)
        if (!db.objectStoreNames.contains('appointments')) {
          const apptStore = db.createObjectStore('appointments', {
            keyPath: 'id',
          });
          apptStore.createIndex('userId', 'userId', { unique: false });
          apptStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
        }

        console.log('[OfflineStorage] Database schema created');
      };
    });
  }

  // Store health data locally
  async storeHealthData(record: Omit<HealthDataRecord, 'id'>): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['healthData'], 'readwrite');
      const store = transaction.objectStore('healthData');
      const request = store.add(record);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Health data stored:', request.result);
        resolve(request.result as number);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to store health data');
        reject(request.error);
      };
    });
  }

  // Get health data by type
  async getHealthData(
    userId: string,
    type?: string,
    limit?: number
  ): Promise<HealthDataRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['healthData'], 'readonly');
      const store = transaction.objectStore('healthData');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        let results = request.result as HealthDataRecord[];

        // Filter by type if specified
        if (type) {
          results = results.filter((r) => r.type === type);
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Limit results if specified
        if (limit) {
          results = results.slice(0, limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get health data');
        reject(request.error);
      };
    });
  }

  // Add item to sync queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(item);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Added to sync queue:', request.result);
        
        // Trigger background sync if available
        this.triggerBackgroundSync(item.type);
        
        resolve(request.result as number);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to add to sync queue');
        reject(request.error);
      };
    });
  }

  // Get all items from sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as SyncQueueItem[]);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to get sync queue');
        reject(request.error);
      };
    });
  }

  // Remove item from sync queue
  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Removed from sync queue:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to remove from sync queue');
        reject(request.error);
      };
    });
  }

  // Mark health data as synced
  async markAsSynced(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['healthData'], 'readwrite');
      const store = transaction.objectStore('healthData');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          const updateRequest = store.put(record);

          updateRequest.onsuccess = () => {
            console.log('[OfflineStorage] Marked as synced:', id);
            resolve();
          };

          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Store emergency contacts for offline access
  async storeEmergencyContacts(userId: string, contacts: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['emergencyContacts'], 'readwrite');
      const store = transaction.objectStore('emergencyContacts');

      // Clear existing contacts for this user
      const index = store.index('userId');
      const clearRequest = index.openCursor(userId);

      clearRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // Add new contacts
          contacts.forEach((contact) => {
            store.add({ userId, ...contact });
          });
          resolve();
        }
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  // Get emergency contacts
  async getEmergencyContacts(userId: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['emergencyContacts'], 'readonly');
      const store = transaction.objectStore('emergencyContacts');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Store medications for offline access
  async storeMedications(medications: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['medications'], 'readwrite');
      const store = transaction.objectStore('medications');

      medications.forEach((med) => {
        store.put(med);
      });

      transaction.oncomplete = () => {
        console.log('[OfflineStorage] Medications stored');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get medications
  async getMedications(userId: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['medications'], 'readonly');
      const store = transaction.objectStore('medications');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Store appointments for offline access
  async storeAppointments(appointments: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['appointments'], 'readwrite');
      const store = transaction.objectStore('appointments');

      appointments.forEach((appt) => {
        store.put(appt);
      });

      transaction.oncomplete = () => {
        console.log('[OfflineStorage] Appointments stored');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get appointments
  async getAppointments(userId: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['appointments'], 'readonly');
      const store = transaction.objectStore('appointments');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const results = request.result;
        // Sort by scheduled time
        results.sort((a, b) => 
          new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
        );
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Trigger background sync
  private async triggerBackgroundSync(type: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`sync-${type}`);
        console.log('[OfflineStorage] Background sync registered:', type);
      } catch (error) {
        console.error('[OfflineStorage] Background sync registration failed:', error);
      }
    }
  }

  // Clear all data (for logout)
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const storeNames = ['healthData', 'syncQueue', 'emergencyContacts', 'medications', 'appointments'];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');

      storeNames.forEach((storeName) => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => {
        console.log('[OfflineStorage] All data cleared');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
