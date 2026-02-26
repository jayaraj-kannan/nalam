// Data Access Layer Tests
// Basic validation tests for DynamoDB operations

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Data Access Layer', () => {
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.AWS_REGION = 'us-east-1';
    process.env.USERS_TABLE = 'test-users';
    process.env.HEALTH_RECORDS_TABLE = 'test-health-records';
    process.env.MEDICATIONS_TABLE = 'test-medications';
    process.env.APPOINTMENTS_TABLE = 'test-appointments';
    process.env.ALERTS_TABLE = 'test-alerts';
    process.env.CARE_CIRCLE_TABLE = 'test-care-circle';
    process.env.DEVICES_TABLE = 'test-devices';
  });

  test('should export table names', () => {
    const { TABLES } = require('../../dynamodb-client');
    
    expect(TABLES.USERS).toBe('test-users');
    expect(TABLES.HEALTH_RECORDS).toBe('test-health-records');
    expect(TABLES.MEDICATIONS).toBe('test-medications');
    expect(TABLES.APPOINTMENTS).toBe('test-appointments');
    expect(TABLES.ALERTS).toBe('test-alerts');
    expect(TABLES.CARE_CIRCLE).toBe('test-care-circle');
    expect(TABLES.DEVICES).toBe('test-devices');
  });

  test('should export user operations', () => {
    const userOps = require('../users');
    
    expect(typeof userOps.createUser).toBe('function');
    expect(typeof userOps.getUser).toBe('function');
    expect(typeof userOps.getUserByEmail).toBe('function');
    expect(typeof userOps.updateUserProfile).toBe('function');
    expect(typeof userOps.updateLastActive).toBe('function');
    expect(typeof userOps.deleteUser).toBe('function');
  });

  test('should export health records operations', () => {
    const healthRecordsOps = require('../health-records');
    
    expect(typeof healthRecordsOps.createHealthRecord).toBe('function');
    expect(typeof healthRecordsOps.getHealthRecord).toBe('function');
    expect(typeof healthRecordsOps.getHealthRecordsByUser).toBe('function');
    expect(typeof healthRecordsOps.getHealthRecordsByType).toBe('function');
    expect(typeof healthRecordsOps.deleteHealthRecord).toBe('function');
  });

  test('should export medication operations', () => {
    const medicationOps = require('../medications');
    
    expect(typeof medicationOps.createMedicationRecord).toBe('function');
    expect(typeof medicationOps.getMedicationRecord).toBe('function');
    expect(typeof medicationOps.getMedicationsByUser).toBe('function');
    expect(typeof medicationOps.updateMedicationStatus).toBe('function');
    expect(typeof medicationOps.updateAdherenceScore).toBe('function');
    expect(typeof medicationOps.deleteMedicationRecord).toBe('function');
  });

  test('should export appointment operations', () => {
    const appointmentOps = require('../appointments');
    
    expect(typeof appointmentOps.createAppointment).toBe('function');
    expect(typeof appointmentOps.getAppointment).toBe('function');
    expect(typeof appointmentOps.getAppointmentsByUser).toBe('function');
    expect(typeof appointmentOps.getUpcomingAppointments).toBe('function');
    expect(typeof appointmentOps.updateAppointmentStatus).toBe('function');
    expect(typeof appointmentOps.updateAppointment).toBe('function');
    expect(typeof appointmentOps.deleteAppointment).toBe('function');
  });

  test('should export alert operations', () => {
    const alertOps = require('../alerts');
    
    expect(typeof alertOps.createAlert).toBe('function');
    expect(typeof alertOps.getAlert).toBe('function');
    expect(typeof alertOps.getAlertsByUser).toBe('function');
    expect(typeof alertOps.getAlertsByStatus).toBe('function');
    expect(typeof alertOps.acknowledgeAlert).toBe('function');
    expect(typeof alertOps.escalateAlert).toBe('function');
    expect(typeof alertOps.deleteAlert).toBe('function');
  });

  test('should export care circle operations', () => {
    const careCircleOps = require('../care-circle');
    
    expect(typeof careCircleOps.addCareCircleMember).toBe('function');
    expect(typeof careCircleOps.getCareCircleMember).toBe('function');
    expect(typeof careCircleOps.getCareCircleMembers).toBe('function');
    expect(typeof careCircleOps.updateCareCirclePermissions).toBe('function');
    expect(typeof careCircleOps.updateCareCircleRelationship).toBe('function');
    expect(typeof careCircleOps.updateCareCircleLastActive).toBe('function');
    expect(typeof careCircleOps.removeCareCircleMember).toBe('function');
    expect(typeof careCircleOps.checkPermission).toBe('function');
  });

  test('should export device operations', () => {
    const deviceOps = require('../devices');
    
    expect(typeof deviceOps.registerDevice).toBe('function');
    expect(typeof deviceOps.getDevice).toBe('function');
    expect(typeof deviceOps.getDevicesByUser).toBe('function');
    expect(typeof deviceOps.updateDeviceStatus).toBe('function');
    expect(typeof deviceOps.updateDeviceBattery).toBe('function');
    expect(typeof deviceOps.updateDeviceSync).toBe('function');
    expect(typeof deviceOps.updateDevice).toBe('function');
    expect(typeof deviceOps.deleteDevice).toBe('function');
  });
});
