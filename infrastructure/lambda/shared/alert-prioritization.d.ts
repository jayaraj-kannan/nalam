import { HealthAlert, AlertSeverity, AlertType } from './types';
/**
 * Calculate priority score for an alert
 * Higher score = higher priority
 */
export declare function calculateAlertPriority(alert: HealthAlert): number;
/**
 * Sort alerts by priority (highest first)
 */
export declare function prioritizeAlerts(alerts: HealthAlert[]): HealthAlert[];
/**
 * Check if two alerts are related and can be consolidated
 */
export declare function areAlertsRelated(alert1: HealthAlert, alert2: HealthAlert): boolean;
/**
 * Consolidate related alerts into groups
 */
export declare function consolidateAlerts(alerts: HealthAlert[]): HealthAlert[][];
/**
 * Create a consolidated alert message from a group of related alerts
 */
export declare function createConsolidatedMessage(alerts: HealthAlert[]): string;
/**
 * Get alerts that need escalation based on time and acknowledgment status
 */
export declare function getAlertsNeedingEscalation(alerts: HealthAlert[], escalationTimeMinutes?: number): HealthAlert[];
/**
 * Filter alerts based on user preferences
 */
export declare function filterAlertsByPreferences(alerts: HealthAlert[], preferences: {
    alertTypes?: {
        [key in AlertType]?: {
            enabled: boolean;
            urgencyLevels: AlertSeverity[];
        };
    };
}): HealthAlert[];
