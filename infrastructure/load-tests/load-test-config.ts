/**
 * Load Testing Configuration
 * Requirements: 9.1 - Test notification delivery under load
 * 
 * Defines load test scenarios for peak usage testing
 */

export interface LoadTestScenario {
  name: string;
  description: string;
  duration: number; // seconds
  virtualUsers: number;
  rampUpTime: number; // seconds
  endpoints: EndpointTest[];
  thresholds: PerformanceThresholds;
}

export interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  weight: number; // percentage of requests (0-100)
  headers?: Record<string, string>;
  body?: any;
  auth?: boolean;
}

export interface PerformanceThresholds {
  maxResponseTime: number; // ms
  maxErrorRate: number; // percentage
  minThroughput: number; // requests per second
  p95ResponseTime: number; // ms
  p99ResponseTime: number; // ms
}

/**
 * Scenario 1: Normal Daily Usage
 * Simulates typical daily traffic patterns
 */
export const normalUsageScenario: LoadTestScenario = {
  name: 'Normal Daily Usage',
  description: 'Simulates typical daily traffic with health data entry, medication checks, and dashboard views',
  duration: 300, // 5 minutes
  virtualUsers: 50,
  rampUpTime: 30,
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/health',
      weight: 10,
    },
    {
      method: 'GET',
      path: '/api/v1/health/trends/{userId}',
      weight: 20,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/health/vitals',
      weight: 15,
      auth: true,
      body: {
        vitals: {
          heartRate: 75,
          bloodPressure: { systolic: 120, diastolic: 80 },
          temperature: 98.6,
          oxygenSaturation: 98,
        },
      },
    },
    {
      method: 'GET',
      path: '/api/v1/medications',
      weight: 15,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/medications/confirm',
      weight: 10,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/appointments',
      weight: 10,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/care-circle/{userId}',
      weight: 15,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/alerts',
      weight: 5,
      auth: true,
    },
  ],
  thresholds: {
    maxResponseTime: 2000,
    maxErrorRate: 1,
    minThroughput: 10,
    p95ResponseTime: 1500,
    p99ResponseTime: 2000,
  },
};

/**
 * Scenario 2: Peak Usage
 * Simulates peak traffic during morning medication reminders
 */
export const peakUsageScenario: LoadTestScenario = {
  name: 'Peak Usage - Morning Medication Rush',
  description: 'Simulates peak traffic when many users receive medication reminders simultaneously',
  duration: 600, // 10 minutes
  virtualUsers: 200,
  rampUpTime: 60,
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/medications',
      weight: 30,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/medications/confirm',
      weight: 25,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/health/trends/{userId}',
      weight: 15,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/health/vitals',
      weight: 15,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/care-circle/{userId}',
      weight: 10,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/alerts',
      weight: 5,
      auth: true,
    },
  ],
  thresholds: {
    maxResponseTime: 3000,
    maxErrorRate: 2,
    minThroughput: 30,
    p95ResponseTime: 2000,
    p99ResponseTime: 3000,
  },
};

/**
 * Scenario 3: Emergency Alert Stress Test
 * Tests system under emergency alert load
 */
export const emergencyAlertScenario: LoadTestScenario = {
  name: 'Emergency Alert Stress Test',
  description: 'Tests notification delivery and alert processing under high load',
  duration: 300, // 5 minutes
  virtualUsers: 100,
  rampUpTime: 30,
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/health/emergency',
      weight: 20,
      auth: true,
      body: {
        userId: 'test-user',
        type: 'manual_alert',
        severity: 'high',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
    },
    {
      method: 'POST',
      path: '/api/v1/alerts/create',
      weight: 30,
      auth: true,
      body: {
        type: 'health',
        severity: 'medium',
        message: 'Abnormal vital signs detected',
      },
    },
    {
      method: 'POST',
      path: '/api/v1/alerts/acknowledge',
      weight: 25,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/alerts',
      weight: 20,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/care-circle/{userId}',
      weight: 5,
      auth: true,
    },
  ],
  thresholds: {
    maxResponseTime: 1000, // Critical: emergency alerts must be fast
    maxErrorRate: 0.5,
    minThroughput: 20,
    p95ResponseTime: 500,
    p99ResponseTime: 1000,
  },
};

/**
 * Scenario 4: Concurrent User Capacity Test
 * Tests maximum concurrent user capacity
 */
export const concurrentUserScenario: LoadTestScenario = {
  name: 'Concurrent User Capacity Test',
  description: 'Tests system capacity with maximum concurrent users',
  duration: 900, // 15 minutes
  virtualUsers: 500,
  rampUpTime: 120,
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/health',
      weight: 5,
    },
    {
      method: 'GET',
      path: '/api/v1/health/trends/{userId}',
      weight: 20,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/health/vitals',
      weight: 15,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/medications',
      weight: 15,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/medications/confirm',
      weight: 10,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/appointments',
      weight: 10,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/care-circle/{userId}',
      weight: 15,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/alerts',
      weight: 5,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/alerts/create',
      weight: 5,
      auth: true,
    },
  ],
  thresholds: {
    maxResponseTime: 5000,
    maxErrorRate: 3,
    minThroughput: 50,
    p95ResponseTime: 3000,
    p99ResponseTime: 5000,
  },
};

/**
 * Scenario 5: Device Data Ingestion Load Test
 * Tests IoT device data processing capacity
 */
export const deviceDataScenario: LoadTestScenario = {
  name: 'Device Data Ingestion Load Test',
  description: 'Tests system capacity for processing device data from multiple health monitors',
  duration: 600, // 10 minutes
  virtualUsers: 150,
  rampUpTime: 60,
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/devices/data',
      weight: 50,
      auth: true,
      body: {
        deviceId: 'test-device',
        readings: [
          { measureName: 'heart_rate', value: 75, unit: 'bpm' },
          { measureName: 'blood_pressure_systolic', value: 120, unit: 'mmHg' },
          { measureName: 'blood_pressure_diastolic', value: 80, unit: 'mmHg' },
        ],
      },
    },
    {
      method: 'GET',
      path: '/api/v1/devices/{deviceId}',
      weight: 20,
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/v1/health/vitals',
      weight: 20,
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/v1/health/trends/{userId}',
      weight: 10,
      auth: true,
    },
  ],
  thresholds: {
    maxResponseTime: 2000,
    maxErrorRate: 1,
    minThroughput: 25,
    p95ResponseTime: 1500,
    p99ResponseTime: 2000,
  },
};

/**
 * All load test scenarios
 */
export const loadTestScenarios = [
  normalUsageScenario,
  peakUsageScenario,
  emergencyAlertScenario,
  concurrentUserScenario,
  deviceDataScenario,
];
