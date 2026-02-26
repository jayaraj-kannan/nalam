import { NotificationChannel, NotificationResult, HealthAlert } from './types';
interface NotificationRequest {
    recipient: string;
    alert: HealthAlert;
    channels: NotificationChannel[];
    priority?: 'normal' | 'high' | 'urgent';
}
/**
 * Send notification to a recipient via multiple channels
 */
export declare function sendNotification(request: NotificationRequest): Promise<NotificationResult[]>;
/**
 * Send notifications to multiple recipients (care circle)
 */
export declare function sendNotificationToCareCircle(userIds: string[], alert: HealthAlert, channels: NotificationChannel[]): Promise<NotificationResult[]>;
export {};
