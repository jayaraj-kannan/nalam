// Send Appointment Reminders Lambda Function
// Requirements: 6.1, 6.2
// Triggered by EventBridge scheduled rules to send appointment reminders

import { EventBridgeEvent } from 'aws-lambda';
import { getUpcomingAppointments } from '../shared/data-access/appointments';
import { getUser } from '../shared/data-access/users';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { sendNotification, sendNotificationToCareCircle } from '../shared/notification-service';
import { HealthAlert, NotificationChannel } from '../shared/types';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = new DynamoDBClient({});

interface AppointmentReminderEvent {
  source: string;
  'detail-type': string;
  detail?: {
    checkTime?: string; // ISO timestamp to check for upcoming appointments
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
 * Check if appointment reminder should be sent
 * Send reminders at 24 hours and 2 hours before appointment
 */
function shouldSendReminder(scheduledTime: Date, checkTime: Date, reminderHours: number): boolean {
  const timeDiff = scheduledTime.getTime() - checkTime.getTime();
  const targetDiff = reminderHours * 60 * 60 * 1000; // Convert hours to milliseconds
  
  // Send reminder if we're within 5 minutes of the target reminder time
  const tolerance = 5 * 60 * 1000; // 5 minutes
  return Math.abs(timeDiff - targetDiff) <= tolerance;
}

/**
 * Send appointment reminder to user and care circle
 */
async function sendAppointmentReminder(
  userId: string,
  appointmentId: string,
  providerName: string,
  appointmentType: string,
  scheduledTime: Date,
  location: string | undefined,
  preparationInstructions: string | undefined,
  reminderHours: number
): Promise<void> {
  try {
    const user = await getUser(userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    // Format reminder message
    const timeUntil = reminderHours === 24 ? '24 hours' : '2 hours';
    const dateStr = scheduledTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let message = `Reminder: You have a ${appointmentType} appointment with ${providerName} in ${timeUntil}.\n`;
    message += `Scheduled for: ${dateStr}`;
    
    if (location) {
      message += `\nLocation: ${location}`;
    }
    
    if (preparationInstructions && reminderHours === 24) {
      message += `\n\nPreparation: ${preparationInstructions}`;
    }

    // Create alert for appointment reminder
    const alert: HealthAlert = {
      id: `appt-reminder-${appointmentId}-${reminderHours}h`,
      userId,
      type: 'appointment',
      severity: reminderHours === 2 ? 'medium' : 'low',
      message,
      timestamp: new Date(),
      acknowledged: false,
      escalated: false,
      relatedData: {
        appointmentId,
        providerName,
        appointmentType,
        scheduledTime: scheduledTime.toISOString(),
        reminderHours,
      },
    };

    // Get user's preferred notification channels
    const channels: NotificationChannel[] = ('preferences' in user && user.preferences?.notificationChannels) 
      ? user.preferences.notificationChannels 
      : ['push', 'sms', 'email'];

    // Send notification to primary user
    await sendNotification({
      recipient: userId,
      alert,
      channels,
      priority: reminderHours === 2 ? 'high' : 'normal',
    });

    console.log(`Appointment reminder sent to user ${userId} for appointment ${appointmentId} (${timeUntil} before)`);

    // Share appointment schedule with care circle (Requirement 6.2)
    try {
      const careCircleMembers = await getCareCircleMembers(userId);
      if (careCircleMembers.length > 0) {
        const careCircleUserIds = careCircleMembers
          .filter(member => member.permissions.canViewAppointments)
          .map(member => member.userId);

        if (careCircleUserIds.length > 0) {
          // Create a simpler message for care circle
          const careCircleMessage = `${user.profile.firstName} ${user.profile.lastName} has a ${appointmentType} appointment with ${providerName} in ${timeUntil}.\nScheduled for: ${dateStr}`;
          
          const careCircleAlert: HealthAlert = {
            ...alert,
            id: `appt-reminder-cc-${appointmentId}-${reminderHours}h`,
            message: careCircleMessage,
          };

          await sendNotificationToCareCircle(
            careCircleUserIds,
            careCircleAlert,
            ['push', 'email']
          );

          console.log(`Appointment reminder shared with ${careCircleUserIds.length} care circle members`);
        }
      }
    } catch (error) {
      console.error('Error notifying care circle:', error);
      // Don't fail if care circle notification fails
    }
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
  }
}

/**
 * Main handler for appointment reminder event
 */
export async function handler(event: EventBridgeEvent<string, AppointmentReminderEvent>): Promise<void> {
  try {
    console.log('Processing appointment reminders:', JSON.stringify(event));

    const detail = event.detail as { checkTime?: string } | undefined;
    const checkTime = (detail && detail.checkTime) 
      ? new Date(detail.checkTime) 
      : new Date();
    console.log('Checking for appointments scheduled around:', checkTime.toISOString());

    // Get all users with appointments
    const userIds = await getAllUsersWithAppointments();
    console.log(`Found ${userIds.length} users with appointments`);

    // Check each user's appointments
    for (const userId of userIds) {
      try {
        // Get upcoming appointments for the next 25 hours (to catch 24-hour reminders)
        const endTime = new Date(checkTime.getTime() + 25 * 60 * 60 * 1000);
        const appointments = await getUpcomingAppointments(userId, checkTime, endTime);
        
        for (const appointment of appointments) {
          // Only send reminders for scheduled or confirmed appointments
          if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
            // Check if reminders are enabled
            if (appointment.reminders.enabled) {
              // Check each reminder time configured
              for (const reminderHours of appointment.reminders.times) {
                if (shouldSendReminder(appointment.scheduledTime, checkTime, reminderHours)) {
                  await sendAppointmentReminder(
                    userId,
                    appointment.id,
                    appointment.provider.name,
                    appointment.type,
                    appointment.scheduledTime,
                    appointment.location,
                    appointment.preparationInstructions,
                    reminderHours
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing appointments for user ${userId}:`, error);
        // Continue with next user
      }
    }

    console.log('Appointment reminders processing complete');
  } catch (error) {
    console.error('Error in appointment reminder handler:', error);
    throw error;
  }
}
