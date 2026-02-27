// Alert Preferences Filter
// Requirements: 9.2
// Filters alerts and notifications based on user preferences

import { AlertType, AlertSeverity, NotificationChannel, AlertPreferences, HealthAlert } from './types';
import { getUser } from './data-access/users';

/**
 * Check if current time is within quiet hours
 */
function isWithinQuietHours(quietHours?: { start: string; end: string }): boolean {
  if (!quietHours) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const { start, end } = quietHours;
  
  // Handle quiet hours that span midnight
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  
  return currentTime >= start && currentTime <= end;
}

/**
 * Check if alert should be sent based on user preferences
 */
export async function shouldSendAlert(
  userId: string,
  alert: HealthAlert
): Promise<boolean> {
  try {
    const user = await getUser(userId);
    if (!user) return true; // Default to sending if user not found

    const preferences = (user as any).alertPreferences as AlertPreferences | undefined;
    if (!preferences) return true; // Default to sending if no preferences set

    // Check if alert type is enabled
    const alertTypeConfig = preferences.alertTypes?.[alert.type];
    if (alertTypeConfig && !alertTypeConfig.enabled) {
      return false;
    }

    // Check if alert severity matches user's urgency level preferences
    if (alertTypeConfig && alertTypeConfig.urgencyLevels) {
      if (!alertTypeConfig.urgencyLevels.includes(alert.severity)) {
        return false;
      }
    }

    // Critical alerts always bypass quiet hours
    if (alert.severity === 'critical') {
      return true;
    }

    // Check quiet hours for non-critical alerts
    if (isWithinQuietHours(preferences.quietHours)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking alert preferences:', error);
    return true; // Default to sending on error
  }
}

/**
 * Get notification channels for a user based on their preferences
 */
export async function getNotificationChannels(
  userId: string,
  alert: HealthAlert
): Promise<NotificationChannel[]> {
  try {
    const user = await getUser(userId);
    if (!user) return ['push', 'sms', 'email']; // Default channels

    const preferences = (user as any).alertPreferences as AlertPreferences | undefined;
    if (!preferences || !preferences.channels) {
      return ['push', 'sms', 'email']; // Default channels
    }

    // Critical alerts use all available channels
    if (alert.severity === 'critical') {
      return ['push', 'sms', 'email'];
    }

    return preferences.channels;
  } catch (error) {
    console.error('Error getting notification channels:', error);
    return ['push', 'sms', 'email']; // Default channels on error
  }
}

/**
 * Filter care circle members based on alert preferences
 */
export async function filterCareCircleByPreferences(
  userIds: string[],
  alert: HealthAlert
): Promise<string[]> {
  const filteredUsers: string[] = [];

  for (const userId of userIds) {
    const shouldSend = await shouldSendAlert(userId, alert);
    if (shouldSend) {
      filteredUsers.push(userId);
    }
  }

  return filteredUsers;
}
