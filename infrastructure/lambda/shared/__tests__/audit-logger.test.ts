// Audit Logger Unit Tests
// Requirements: 8.4 - Test audit logging functionality

import {
  logAuditEvent,
  logDataAccess,
  logPermissionChange,
  logCareCircleAccess,
  AuditEvent,
} from '../audit-logger';
import * as dynamodbClient from '../dynamodb-client';
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

// Mock dependencies
jest.mock('../dynamodb-client');
jest.mock('@aws-sdk/client-cloudwatch-logs');

const mockPutItem = dynamodbClient.putItem as jest.MockedFunction<typeof dynamodbClient.putItem>;

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPutItem.mockResolvedValue();
  });

  describe('logAuditEvent', () => {
    it('should log audit event to DynamoDB', async () => {
      const event: AuditEvent = {
        eventType: 'DATA_ACCESS',
        userId: 'user-123',
        userType: 'primary',
        resource: '/api/health/vitals',
        action: 'read',
        timestamp: '2024-01-15T12:00:00Z',
        success: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await logAuditEvent(event);

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          eventType: 'DATA_ACCESS',
          userId: 'user-123',
          userType: 'primary',
          resource: '/api/health/vitals',
          action: 'read',
          timestamp: '2024-01-15T12:00:00Z',
          success: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          ttl: expect.any(Number),
        })
      );
    });

    it('should not throw error if logging fails', async () => {
      mockPutItem.mockRejectedValue(new Error('DynamoDB error'));

      const event: AuditEvent = {
        eventType: 'DATA_ACCESS',
        userId: 'user-123',
        userType: 'primary',
        timestamp: '2024-01-15T12:00:00Z',
        success: true,
      };

      await expect(logAuditEvent(event)).resolves.not.toThrow();
    });

    it('should set TTL to 7 years for HIPAA compliance', async () => {
      const event: AuditEvent = {
        eventType: 'DATA_ACCESS',
        userId: 'user-123',
        userType: 'primary',
        timestamp: '2024-01-15T12:00:00Z',
        success: true,
      };

      const now = Date.now();
      await logAuditEvent(event);

      const sevenYearsInSeconds = 7 * 365 * 24 * 60 * 60;
      const expectedTTL = Math.floor(now / 1000) + sevenYearsInSeconds;

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          ttl: expect.any(Number),
        })
      );

      const actualTTL = (mockPutItem.mock.calls[0][1] as any).ttl;
      expect(actualTTL).toBeGreaterThanOrEqual(expectedTTL - 10);
      expect(actualTTL).toBeLessThanOrEqual(expectedTTL + 10);
    });
  });

  describe('logDataAccess', () => {
    it('should log data access event with correct structure', async () => {
      await logDataAccess(
        'user-123',
        'secondary',
        'primary-456',
        'vitals',
        'read',
        true,
        ['canViewVitals'],
        { relationship: 'child' }
      );

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          eventType: 'DATA_ACCESS',
          userId: 'user-123',
          userType: 'secondary',
          targetUserId: 'primary-456',
          dataType: 'vitals',
          action: 'read',
          success: true,
          permissionsChecked: ['canViewVitals'],
          relationship: 'child',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log failed data access attempts', async () => {
      await logDataAccess(
        'user-123',
        'secondary',
        'primary-456',
        'healthRecords',
        'read',
        false,
        ['canViewHealthRecords'],
        { reason: 'Insufficient permissions' }
      );

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          success: false,
          reason: 'Insufficient permissions',
        })
      );
    });
  });

  describe('logPermissionChange', () => {
    it('should log permission changes with old and new values', async () => {
      const oldPermissions = {
        canViewVitals: true,
        canViewMedications: false,
      };

      const newPermissions = {
        canViewVitals: true,
        canViewMedications: true,
      };

      await logPermissionChange(
        'primary-123',
        'primary',
        'secondary-456',
        'primary-123',
        oldPermissions,
        newPermissions,
        { relationship: 'child' }
      );

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          eventType: 'PERMISSION_CHANGE',
          userId: 'primary-123',
          userType: 'primary',
          targetUserId: 'secondary-456',
          success: true,
          dataAccessed: [
            `Old: ${JSON.stringify(oldPermissions)}`,
            `New: ${JSON.stringify(newPermissions)}`,
            'Primary: primary-123',
          ],
          relationship: 'child',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('logCareCircleAccess', () => {
    it('should log care circle access events', async () => {
      await logCareCircleAccess(
        'secondary-456',
        'primary-123',
        'view-dashboard',
        true,
        ['canViewVitals', 'canViewMedications'],
        { dataViewed: ['vitals', 'medications'] }
      );

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          eventType: 'CARE_CIRCLE_ACCESS',
          userId: 'secondary-456',
          userType: 'secondary',
          targetUserId: 'primary-123',
          action: 'view-dashboard',
          success: true,
          permissionsChecked: ['canViewVitals', 'canViewMedications'],
          dataViewed: ['vitals', 'medications'],
          timestamp: expect.any(String),
        })
      );
    });

    it('should log failed care circle access attempts', async () => {
      await logCareCircleAccess(
        'secondary-456',
        'primary-123',
        'view-health-records',
        false,
        ['canViewHealthRecords'],
        { reason: 'Permission denied' }
      );

      expect(mockPutItem).toHaveBeenCalledWith(
        'audit-logs',
        expect.objectContaining({
          success: false,
          reason: 'Permission denied',
        })
      );
    });
  });
});
