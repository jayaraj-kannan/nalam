// Send Alert Notifications Handler
// Requirements: 9.1, 9.2, 9.4

import { EventBridgeEvent } from 'aws-lambda';
import { HealthAlert, NotificationChannel } from '../shared/types';
import { sendNotificationToCareCircle } from '../shared/notification-service';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';

interface AlertEventDetail {
  alert: HealthAlert;
  userId: string;
}

export async function handler(event: EventBridgeEvent<'AlertCreated', AlertEventDetail>): Promise<void> {
  try {
    const { alert, userId } = event.detail;

    console.log('Sending alert notifications:', {
      alertId: alert.id,
      userId,
      type: alert.type,
      severity: alert.severity,
    });

    // Get care circle members
    const careCircleMembers = await getCareCircleMembers(userId);
    
    // Filter members who can receive alerts
    const eligibleMembers = careCircleMembers.filter(m => m.permissions.canReceiveAlerts);

    if (eligibleMembers.length === 0) {
      console.log('No care circle members eligible to receive alerts');
      return;
    }

    // Get notification preferences for each member
    const memberIds = eligibleMembers.map(m => m.secondaryUserId);
    const members = await Promise.all(memberIds.map(id => getUser(id)));

    // Determine channels based on alert severity and user preferences
    const channels: NotificationChannel[] = [];
    
    // For critical and high severity alerts, use all channels
    if (alert.severity === 'critical' || alert.severity === 'high') {
      channels.push('push', 'sms', 'email');
    } else if (alert.severity === 'medium') {
      channels.push('push', 'email');
    } else {
      channels.push('push');
    }

    // Apply user preferences if available
    const finalChannels = members.map((member, index) => {
      if (!member) return channels;
      
      const preferences = 'alertPreferences' in member ? member.alertPreferences : null;
      if (!preferences) return channels;

      // Check if user has preferences for this alert type
      const alertTypePrefs = preferences.alertTypes?.[alert.type];
      if (alertTypePrefs && !alertTypePrefs.enabled) {
        return []; // User disabled this alert type
      }

      // Check if user wants this severity level
      if (alertTypePrefs?.urgencyLevels && !alertTypePrefs.urgencyLevels.includes(alert.severity)) {
        return []; // User doesn't want this severity level
      }

      // Use user's preferred channels if specified
      if (preferences.channels && preferences.channels.length > 0) {
        return preferences.channels.filter(c => channels.includes(c));
      }

      return channels;
    });

    // Send notifications to care circle members
    const results = await sendNotificationToCareCircle(
      memberIds,
      alert,
      channels
    );

    // Log results
    const successCount = results.filter(r => r.status === 'sent' || r.status === 'delivered').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log('Notification results:', {
      total: results.length,
      successful: successCount,
      failed: failedCount,
    });

    if (failedCount > 0) {
      console.warn('Some notifications failed:', results.filter(r => r.status === 'failed'));
    }
  } catch (error) {
    console.error('Error sending alert notifications:', error);
    throw error;
  }
}
