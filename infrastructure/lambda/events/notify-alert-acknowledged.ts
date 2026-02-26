// Notify Care Circle of Alert Acknowledgment Handler
// Requirements: 9.5

import { EventBridgeEvent } from 'aws-lambda';
import { sendNotificationToCareCircle } from '../shared/notification-service';
import { getAlert } from '../shared/data-access/alerts';
import { getUser } from '../shared/data-access/users';

interface AlertAcknowledgedDetail {
  alertId: string;
  userId: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  careCircleMembers: string[];
}

export async function handler(event: EventBridgeEvent<'AlertAcknowledged', AlertAcknowledgedDetail>): Promise<void> {
  try {
    const detail = event.detail;

    console.log('Notifying care circle of alert acknowledgment:', {
      alertId: detail.alertId,
      acknowledgedBy: detail.acknowledgedBy,
    });

    // Get the alert details
    const alert = await getAlert(detail.alertId, new Date(detail.acknowledgedAt).toISOString());
    if (!alert) {
      console.error('Alert not found:', detail.alertId);
      return;
    }

    // Get the user who acknowledged the alert
    const acknowledger = await getUser(detail.acknowledgedBy);
    const acknowledgerName = acknowledger 
      ? `${acknowledger.profile.firstName} ${acknowledger.profile.lastName}`
      : 'A care circle member';

    // Create notification message
    const notificationMessage = `${acknowledgerName} has acknowledged the ${alert.type.replace(/_/g, ' ')} alert for ${detail.userId}. The situation is being handled.`;

    // Send notification to other care circle members (excluding the acknowledger)
    const otherMembers = detail.careCircleMembers.filter(id => id !== detail.acknowledgedBy);

    if (otherMembers.length === 0) {
      console.log('No other care circle members to notify');
      return;
    }

    // Create a notification alert
    const notificationAlert = {
      ...alert,
      message: notificationMessage,
      severity: 'low' as const, // Acknowledgment notifications are low priority
    };

    // Send notifications via push and email (not SMS for acknowledgments)
    await sendNotificationToCareCircle(
      otherMembers,
      notificationAlert,
      ['push', 'email']
    );

    console.log('Care circle notified of alert acknowledgment');
  } catch (error) {
    console.error('Error notifying care circle of acknowledgment:', error);
    throw error;
  }
}
