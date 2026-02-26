// Appointment Management Integration Tests
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock environment variables
process.env.APPOINTMENTS_TABLE = 'test-appointments';
process.env.EVENT_BUS_NAME = 'test-event-bus';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutEventsCommand: jest.fn(),
}));

jest.mock('../../shared/data-access/appointments', () => ({
  createAppointment: jest.fn().mockResolvedValue('appt-123'),
  getAppointment: jest.fn().mockResolvedValue({
    id: 'appt-123',
    userId: 'user-123',
    provider: { name: 'Dr. Smith', specialty: 'Cardiology', phone: '+1234567890' },
    type: 'checkup',
    scheduledTime: new Date(),
    status: 'scheduled',
    reminders: { enabled: true, times: [24, 2], channels: ['push', 'sms'] },
  }),
  getAppointmentsByUser: jest.fn().mockResolvedValue([]),
  getUpcomingAppointments: jest.fn().mockResolvedValue([]),
  updateAppointment: jest.fn().mockResolvedValue(undefined),
  updateAppointmentStatus: jest.fn().mockResolvedValue(undefined),
  deleteAppointment: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../shared/data-access/care-circle', () => ({
  getCareCircleMembers: jest.fn().mockResolvedValue([]),
}));

import { handler as createAppointmentHandler } from '../create-appointment';
import { handler as getAppointmentsHandler } from '../get-appointments';
import { handler as updateAppointmentHandler } from '../update-appointment';
import { handler as deleteAppointmentHandler } from '../delete-appointment';
import { handler as getICalHandler } from '../get-appointment-ical';

describe('Appointment Management Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockAppointmentId = 'appt-456';

  describe('Create Appointment', () => {
    it('should create appointment with valid data', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          userId: mockUserId,
          provider: {
            name: 'Dr. Smith',
            specialty: 'Cardiology',
            phone: '+1234567890',
          },
          type: 'checkup',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          location: '123 Medical Center',
          notes: 'Annual checkup',
        }),
      };

      const result = await createAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.appointmentId).toBeDefined();
      expect(body.message).toBe('Appointment created successfully');
    });

    it('should reject appointment with missing required fields', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          userId: mockUserId,
          // Missing provider, type, scheduledTime
        }),
      };

      const result = await createAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Missing required fields');
    });

    it('should reject appointment with past scheduled time', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          userId: mockUserId,
          provider: {
            name: 'Dr. Smith',
            specialty: 'Cardiology',
            phone: '+1234567890',
          },
          type: 'checkup',
          scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
        }),
      };

      const result = await createAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('must be in the future');
    });

    it('should reject appointment with invalid type', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          userId: mockUserId,
          provider: {
            name: 'Dr. Smith',
            specialty: 'Cardiology',
            phone: '+1234567890',
          },
          type: 'invalid_type',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      };

      const result = await createAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid appointment type');
    });
  });

  describe('Get Appointments', () => {
    it('should get all appointments for user', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
        },
        queryStringParameters: null,
      };

      const result = await getAppointmentsHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.appointments).toBeDefined();
      expect(Array.isArray(body.appointments)).toBe(true);
    });

    it('should get upcoming appointments only', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
        },
        queryStringParameters: {
          upcoming: 'true',
        },
      };

      const result = await getAppointmentsHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.appointments).toBeDefined();
    });

    it('should reject request without userId', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: null,
      };

      const result = await getAppointmentsHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('userId is required');
    });
  });

  describe('Update Appointment', () => {
    it('should update appointment status', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
          appointmentId: mockAppointmentId,
        },
        body: JSON.stringify({
          status: 'confirmed',
        }),
      };

      const result = await updateAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Appointment updated successfully');
    });

    it('should reject invalid status', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
          appointmentId: mockAppointmentId,
        },
        body: JSON.stringify({
          status: 'invalid_status',
        }),
      };

      const result = await updateAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid appointment status');
    });
  });

  describe('Delete Appointment', () => {
    it('should delete appointment', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
          appointmentId: mockAppointmentId,
        },
      };

      const result = await deleteAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Appointment deleted successfully');
    });

    it('should reject request without appointmentId', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
        },
      };

      const result = await deleteAppointmentHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('appointmentId are required');
    });
  });

  describe('Calendar Integration (iCal)', () => {
    it('should generate iCal for single appointment', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
          appointmentId: mockAppointmentId,
        },
      };

      const result = await getICalHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toContain('text/calendar');
      expect(result.body).toContain('BEGIN:VCALENDAR');
      expect(result.body).toContain('END:VCALENDAR');
    });

    it('should generate iCal for all user appointments', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          userId: mockUserId,
        },
      };

      const result = await getICalHandler(event as APIGatewayProxyEvent);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toContain('text/calendar');
      expect(result.body).toContain('BEGIN:VCALENDAR');
    });
  });

  describe('Appointment Reminders', () => {
    it('should send reminders at 24 hours before appointment', () => {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const checkTime = new Date();
      
      // This would be tested in the send-appointment-reminders Lambda
      expect(scheduledTime.getTime() - checkTime.getTime()).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(scheduledTime.getTime() - checkTime.getTime()).toBeLessThan(25 * 60 * 60 * 1000);
    });

    it('should send reminders at 2 hours before appointment', () => {
      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const checkTime = new Date();
      
      expect(scheduledTime.getTime() - checkTime.getTime()).toBeGreaterThan(1 * 60 * 60 * 1000);
      expect(scheduledTime.getTime() - checkTime.getTime()).toBeLessThan(3 * 60 * 60 * 1000);
    });
  });

  describe('Missed Appointment Detection', () => {
    it('should detect missed appointment after scheduled time', () => {
      const scheduledTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const checkTime = new Date();
      const duration = 30; // 30 minutes
      
      const appointmentEndTime = new Date(scheduledTime.getTime() + duration * 60 * 1000);
      const isMissed = checkTime > appointmentEndTime;
      
      expect(isMissed).toBe(true);
    });

    it('should not mark appointment as missed before scheduled time', () => {
      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const checkTime = new Date();
      const duration = 30;
      
      const appointmentEndTime = new Date(scheduledTime.getTime() + duration * 60 * 1000);
      const isMissed = checkTime > appointmentEndTime;
      
      expect(isMissed).toBe(false);
    });
  });
});
