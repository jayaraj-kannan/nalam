// Tests for Offline Storage Service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineStorage, HealthDataRecord } from '../OfflineStorageService';

// Mock IndexedDB
const mockIndexedDB = () => {
  const store: Record<string, any> = {};
  
  return {
    open: vi.fn(() => ({
      result: {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn((data) => {
              const id = Date.now();
              store[id] = { ...data, id };
              return { result: id, onsuccess: null, onerror: null };
            }),
            get: vi.fn((id) => ({
              result: store[id],
              onsuccess: null,
              onerror: null,
            })),
            getAll: vi.fn(() => ({
              result: Object.values(store),
              onsuccess: null,
              onerror: null,
            })),
            put: vi.fn((data) => {
              store[data.id] = data;
              return { onsuccess: null, onerror: null };
            }),
            delete: vi.fn((id) => {
              delete store[id];
              return { onsuccess: null, onerror: null };
            }),
            clear: vi.fn(() => {
              Object.keys(store).forEach((key) => delete store[key]);
              return { onsuccess: null, onerror: null };
            }),
            index: vi.fn(() => ({
              getAll: vi.fn(() => ({
                result: Object.values(store),
                onsuccess: null,
                onerror: null,
              })),
            })),
          })),
        })),
      },
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    })),
  };
};

describe('OfflineStorageService', () => {
  beforeEach(() => {
    // Mock IndexedDB
    global.indexedDB = mockIndexedDB() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Data Storage', () => {
    it('should store health data locally', async () => {
      const healthData: Omit<HealthDataRecord, 'id'> = {
        userId: 'user-123',
        type: 'vitals',
        data: {
          heartRate: 75,
          bloodPressure: { systolic: 120, diastolic: 80 },
        },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      };

      const id = await offlineStorage.storeHealthData(healthData);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('should retrieve health data by user ID', async () => {
      const userId = 'user-123';
      const healthData: Omit<HealthDataRecord, 'id'> = {
        userId,
        type: 'vitals',
        data: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      };

      await offlineStorage.storeHealthData(healthData);
      const records = await offlineStorage.getHealthData(userId);
      
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
    });

    it('should filter health data by type', async () => {
      const userId = 'user-123';
      
      await offlineStorage.storeHealthData({
        userId,
        type: 'vitals',
        data: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      });

      await offlineStorage.storeHealthData({
        userId,
        type: 'medication',
        data: { medicationId: 'med-1' },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      });

      const vitalsRecords = await offlineStorage.getHealthData(userId, 'vitals');
      expect(vitalsRecords.every((r) => r.type === 'vitals')).toBe(true);
    });

    it('should limit health data results', async () => {
      const userId = 'user-123';
      
      // Store multiple records
      for (let i = 0; i < 5; i++) {
        await offlineStorage.storeHealthData({
          userId,
          type: 'vitals',
          data: { heartRate: 70 + i },
          timestamp: new Date().toISOString(),
          synced: false,
          syncAttempts: 0,
        });
      }

      const records = await offlineStorage.getHealthData(userId, undefined, 3);
      expect(records.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Sync Queue', () => {
    it('should add items to sync queue', async () => {
      const item = {
        type: 'health-data',
        payload: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        attempts: 0,
      };

      const id = await offlineStorage.addToSyncQueue(item);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('should retrieve all sync queue items', async () => {
      await offlineStorage.addToSyncQueue({
        type: 'health-data',
        payload: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        attempts: 0,
      });

      const queue = await offlineStorage.getSyncQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should remove items from sync queue', async () => {
      const id = await offlineStorage.addToSyncQueue({
        type: 'health-data',
        payload: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        attempts: 0,
      });

      await offlineStorage.removeFromSyncQueue(id);
      
      // Verify removal (implementation dependent)
      const queue = await offlineStorage.getSyncQueue();
      expect(queue.find((item) => item.id === id)).toBeUndefined();
    });
  });

  describe('Emergency Contacts', () => {
    it('should store emergency contacts', async () => {
      const userId = 'user-123';
      const contacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          relationship: 'Son',
          phoneNumber: '+1234567890',
          email: 'john@example.com',
          priority: 1,
        },
      ];

      await offlineStorage.storeEmergencyContacts(userId, contacts);
      const retrieved = await offlineStorage.getEmergencyContacts(userId);
      
      expect(Array.isArray(retrieved)).toBe(true);
    });

    it('should retrieve emergency contacts by user ID', async () => {
      const userId = 'user-123';
      const contacts = [
        {
          id: 'contact-1',
          name: 'Jane Doe',
          relationship: 'Daughter',
          phoneNumber: '+1234567890',
          email: 'jane@example.com',
          priority: 1,
        },
      ];

      await offlineStorage.storeEmergencyContacts(userId, contacts);
      const retrieved = await offlineStorage.getEmergencyContacts(userId);
      
      expect(retrieved.length).toBeGreaterThan(0);
    });
  });

  describe('Medications', () => {
    it('should store medications', async () => {
      const medications = [
        {
          id: 'med-1',
          userId: 'user-123',
          name: 'Aspirin',
          dosage: '100mg',
          frequency: 'daily',
        },
      ];

      await offlineStorage.storeMedications(medications);
      const retrieved = await offlineStorage.getMedications('user-123');
      
      expect(Array.isArray(retrieved)).toBe(true);
    });

    it('should retrieve medications by user ID', async () => {
      const userId = 'user-123';
      const medications = [
        {
          id: 'med-1',
          userId,
          name: 'Medication A',
          dosage: '50mg',
          frequency: 'twice daily',
        },
      ];

      await offlineStorage.storeMedications(medications);
      const retrieved = await offlineStorage.getMedications(userId);
      
      expect(retrieved.length).toBeGreaterThan(0);
    });
  });

  describe('Appointments', () => {
    it('should store appointments', async () => {
      const appointments = [
        {
          id: 'appt-1',
          userId: 'user-123',
          provider: 'Dr. Smith',
          scheduledTime: new Date().toISOString(),
          type: 'checkup',
        },
      ];

      await offlineStorage.storeAppointments(appointments);
      const retrieved = await offlineStorage.getAppointments('user-123');
      
      expect(Array.isArray(retrieved)).toBe(true);
    });

    it('should sort appointments by scheduled time', async () => {
      const userId = 'user-123';
      const now = new Date();
      const appointments = [
        {
          id: 'appt-2',
          userId,
          provider: 'Dr. Jones',
          scheduledTime: new Date(now.getTime() + 86400000).toISOString(), // Tomorrow
          type: 'followup',
        },
        {
          id: 'appt-1',
          userId,
          provider: 'Dr. Smith',
          scheduledTime: now.toISOString(), // Today
          type: 'checkup',
        },
      ];

      await offlineStorage.storeAppointments(appointments);
      const retrieved = await offlineStorage.getAppointments(userId);
      
      // Should be sorted by time (earliest first)
      if (retrieved.length >= 2) {
        const time1 = new Date(retrieved[0].scheduledTime).getTime();
        const time2 = new Date(retrieved[1].scheduledTime).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });
  });

  describe('Data Management', () => {
    it('should mark health data as synced', async () => {
      const healthData: Omit<HealthDataRecord, 'id'> = {
        userId: 'user-123',
        type: 'vitals',
        data: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      };

      const id = await offlineStorage.storeHealthData(healthData);
      await offlineStorage.markAsSynced(id);
      
      // Verify sync status (implementation dependent)
      const records = await offlineStorage.getHealthData('user-123');
      const record = records.find((r) => r.id === id);
      expect(record?.synced).toBe(true);
    });

    it('should clear all data', async () => {
      // Store some data
      await offlineStorage.storeHealthData({
        userId: 'user-123',
        type: 'vitals',
        data: { heartRate: 75 },
        timestamp: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
      });

      await offlineStorage.clearAll();
      
      // Verify all stores are empty
      const healthData = await offlineStorage.getHealthData('user-123');
      const syncQueue = await offlineStorage.getSyncQueue();
      
      expect(healthData.length).toBe(0);
      expect(syncQueue.length).toBe(0);
    });
  });
});
