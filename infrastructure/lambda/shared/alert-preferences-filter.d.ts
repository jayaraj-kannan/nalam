import { NotificationChannel, HealthAlert } from './types';
/**
 * Check if alert should be sent based on user preferences
 */
export declare function shouldSendAlert(userId: string, alert: HealthAlert): Promise<boolean>;
/**
 * Get notification channels for a user based on their preferences
 */
export declare function getNotificationChannels(userId: string, alert: HealthAlert): Promise<NotificationChannel[]>;
/**
 * Filter care circle members based on alert preferences
 */
export declare function filterCareCircleByPreferences(userIds: string[], alert: HealthAlert): Promise<string[]>;
