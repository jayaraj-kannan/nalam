// Check Missed Appointments Lambda Function
// Requirements: 6.4
// Triggered by EventBridge scheduled rules to detect missed appointments

import { EventBridgeEvent } from 'aws-lambda';
import { getUpcomingAppointments, updateAppointmentStatus } from '../shared/data-access/appointments';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';
import { sendNotificationToCareCircle } from '../shared/notification-service';
import { HealthAlert } from '../shared/types';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = new DynamoDBClient({});

interface MissedAppointmentCheckEvent {
  source: string;
  'detail-type': string;
  detail?: {
    checkTime?: string; // ISO timestamp to check for missed appointments
  };
}

/**
 * Get all users who have appointments scheduled
 */
async function getAllUsersWithAppointments(): Promise<string[]> {
  const userIds = new Set<string>();
  
  try {
    const result = await dynamodbClient.send(new ScanCommand({
      TableName: process.env.APPOINTMENTS_TABLE || 'healthcare-appointments-dev',
      ProjectionExpression: 'userId',
    }));

    if (result.Items) {
      result.Items.forEach(item => {
        const unmarshalled = unmarshall(item);
        if (unmarshalled.userId) {
          userIds.add(unmarshalled.userId as string);
        }
      });
    }
  } catch (error) {
    console.error('Error scanning appointments table:', error);
  }

  return Array.from(userIds);
}

/**
 * Check if appointment should be marked as missed
 * An appointment is considered missed if:
 * - Status is 'scheduled' or 'confirmed'
 * - Scheduled time has passed by more than the appointment duration (or 30 minutes default)
 */
function isMissedAppointment(scheduledTime: Date, duration: number | undefined, checkTime: Date): boolean {
  const appointmentDuration = duration || 30; // Default 30 minutes
  const appointmentEndTime = new Date(scheduledTime.getTime() + appointmentDuration * 60 * 1000);
  
  // Consider missed if current time is past the appointment end time
  return checkTime > appointmentEndTime;
}

/**
 * Mark appointment as missed and notify care circle
 */
async function handleMissedAppointment(
  userId: string,
  appointmentId: string,
  providerName: string,
  appointmentType: string,
  scheduledTime: Date
): Promise<void> {
  try {
    // Update appointment status to 'missed'
    await updateAppointmentStatus(userId, appointmentId, 'missed', 'Automatically marked as missed');
    
    console.log(`Appointment ${appointmentId} marked as missed for user ${userId}`);

    // Get user information
    const user = await getUser(userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    // Notify care circle members (Requirement 6.4)
    try {
      const careCircleMembers = await getCareCircleMembers(userId);
      if (careCircleMembers.length > 0) {
        const careCircleUserIds = careCircleMembers
          .filter(member => member.permissions.canViewAppointments && member.permissions.canReceiveAlerts)
          .map(member => member.userId);

        if (careCircleUserIds.length > 0) {
          const dateStr = scheduledTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const message = `${user.profile.firstName} ${user.profile.lastName} missed a ${appointmentType} appointment with ${providerName}.\nScheduled for: ${dateStr}`;

          // Create alert for missed appointment
          const alert: HealthAlert = {
            id: `missed-appt-${appointmentId}`,
            userId,
            type: 'appointment',
            severity: 'medium',
            message,
            timestamp: new Date(),
            acknowledged: false,
            escalated: false,
            relatedData: {
              appointmentId,
              providerName,
              appointmentType,
              scheduledTime: scheduledTime.toISOString(),
              status: 'missed',
            },
          };

          await sendNotificationToCareCircle(
            careCircleUserIds,
            alert,
            ['push', 'sms', 'email']
          );

          console.log(`Missed appointment notification sent to ${careCircleUserIds.length} care circle members`);
        }
      }
    } catch (error) {
      console.error('Error notifying care circle about missed appointment:', error);
      // Don't fail if care circle notification fails
    }
  } catch (error) {
    console.error('Error handling missed appointment:', error);
  }
}

/**
 * Main handler for missed appointment check event
 */
export async function handler(event: EventBridgeEvent<string, MissedAppointmentCheckEvent>): Promise<void> {
  try {
    console.log('Checking for missed appointments:', JSON.stringify(event));

    const detail = event.detail as { checkTime?: string } | undefined;
    const checkTime = (detail && detail.checkTime) 
      ? new Date(detail.checkTime) 
      : new Date();
    console.log('Checking for appointments missed as of:', checkTime.toISOString());

    // Get all users with appointments
    const userIds = await getAllUsersWithAppointments();
    console.log(`Found ${userIds.length} users with appointments`);

    let missedCount = 0;

    // Check each user's appointments
    for (const userId of userIds) {
      try {
        // Get appointments from 7 days ago to now (to catch recently missed appointments)
        const startTime = new Date(checkTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        const appointments = await getUpcomingAppointments(userId, startTime, checkTime);
        
        for (const appointment of appointments) {
          // Only check scheduled or confirmed appointments
          if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
            if (isMissedAppointment(appointment.scheduledTime, appointment.duration, checkTime)) {
              await handleMissedAppointment(
                userId,
                appointment.id,
                appointment.provider.name,
                appointment.type,
                appointment.scheduledTime
              );
              missedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error checking appointments for user ${userId}:`, error);
        // Continue with next user
      }
    }

    console.log(`Missed appointment check complete. Found ${missedCount} missed appointments.`);
  } catch (error) {
    console.error('Error in missed appointment check handler:', error);
    throw error;
  }
}
