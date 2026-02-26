// Alert Prioritization and Consolidation Service
// Requirements: 9.3, 9.5

import { HealthAlert, AlertSeverity, AlertType } from './types';

/**
 * Priority score for each severity level
 */
const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Priority score for each alert type
 */
const TYPE_PRIORITY: Record<AlertType, number> = {
  emergency: 7,
  fall_detection: 6,
  vital_signs: 5,
  check_in: 4,
  medication: 3,
  device: 2,
  appointment: 1,
};

/**
 * Calculate priority score for an alert
 * Higher score = higher priority
 */
export function calculateAlertPriority(alert: HealthAlert): number {
  const severityScore = SEVERITY_PRIORITY[alert.severity] * 10;
  const typeScore = TYPE_PRIORITY[alert.type];
  const escalationBonus = alert.escalated ? 20 : 0;
  const unacknowledgedBonus = !alert.acknowledged ? 10 : 0;
  
  // More recent alerts get slightly higher priority
  const ageInMinutes = (Date.now() - alert.timestamp.getTime()) / (1000 * 60);
  const recencyScore = Math.max(0, 5 - (ageInMinutes / 60)); // Decreases over hours
  
  return severityScore + typeScore + escalationBonus + unacknowledgedBonus + recencyScore;
}

/**
 * Sort alerts by priority (highest first)
 */
export function prioritizeAlerts(alerts: HealthAlert[]): HealthAlert[] {
  return [...alerts].sort((a, b) => {
    const priorityA = calculateAlertPriority(a);
    const priorityB = calculateAlertPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    
    // If same priority, newer alerts first
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

/**
 * Check if two alerts are related and can be consolidated
 */
export function areAlertsRelated(alert1: HealthAlert, alert2: HealthAlert): boolean {
  // Same user and same type
  if (alert1.userId !== alert2.userId || alert1.type !== alert2.type) {
    return false;
  }
  
  // Within 15 minutes of each other
  const timeDiff = Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime());
  const fifteenMinutes = 15 * 60 * 1000;
  
  if (timeDiff > fifteenMinutes) {
    return false;
  }
  
  // Check if related data indicates same issue
  if (alert1.relatedData && alert2.relatedData) {
    // For vital signs alerts, check if same metric
    if (alert1.type === 'vital_signs') {
      const metric1 = alert1.relatedData.metric;
      const metric2 = alert2.relatedData.metric;
      return metric1 === metric2;
    }
    
    // For medication alerts, check if same medication
    if (alert1.type === 'medication') {
      const med1 = alert1.relatedData.medicationId;
      const med2 = alert2.relatedData.medicationId;
      return med1 === med2;
    }
    
    // For device alerts, check if same device
    if (alert1.type === 'device') {
      const device1 = alert1.relatedData.deviceId;
      const device2 = alert2.relatedData.deviceId;
      return device1 === device2;
    }
  }
  
  return true;
}

/**
 * Consolidate related alerts into groups
 */
export function consolidateAlerts(alerts: HealthAlert[]): HealthAlert[][] {
  const consolidated: HealthAlert[][] = [];
  const processed = new Set<string>();
  
  for (const alert of alerts) {
    if (processed.has(alert.id)) {
      continue;
    }
    
    const group: HealthAlert[] = [alert];
    processed.add(alert.id);
    
    // Find related alerts
    for (const otherAlert of alerts) {
      if (processed.has(otherAlert.id)) {
        continue;
      }
      
      if (areAlertsRelated(alert, otherAlert)) {
        group.push(otherAlert);
        processed.add(otherAlert.id);
      }
    }
    
    consolidated.push(group);
  }
  
  return consolidated;
}

/**
 * Create a consolidated alert message from a group of related alerts
 */
export function createConsolidatedMessage(alerts: HealthAlert[]): string {
  if (alerts.length === 1) {
    return alerts[0].message;
  }
  
  const firstAlert = alerts[0];
  const count = alerts.length;
  
  // Get the highest severity in the group
  const highestSeverity = alerts.reduce((max, alert) => {
    const severityOrder: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
    return severityOrder.indexOf(alert.severity) > severityOrder.indexOf(max) ? alert.severity : max;
  }, 'low' as AlertSeverity);
  
  const typeLabel = firstAlert.type.replace(/_/g, ' ');
  
  return `${count} ${typeLabel} alerts (${highestSeverity} severity): ${firstAlert.message}${count > 1 ? ` and ${count - 1} more` : ''}`;
}

/**
 * Get alerts that need escalation based on time and acknowledgment status
 */
export function getAlertsNeedingEscalation(alerts: HealthAlert[], escalationTimeMinutes: number = 30): HealthAlert[] {
  const now = Date.now();
  const escalationThreshold = escalationTimeMinutes * 60 * 1000;
  
  return alerts.filter(alert => {
    // Already escalated
    if (alert.escalated) {
      return false;
    }
    
    // Already acknowledged
    if (alert.acknowledged) {
      return false;
    }
    
    // Only escalate medium severity and above
    if (alert.severity === 'low') {
      return false;
    }
    
    // Check if enough time has passed
    const timeSinceAlert = now - alert.timestamp.getTime();
    return timeSinceAlert >= escalationThreshold;
  });
}

/**
 * Filter alerts based on user preferences
 */
export function filterAlertsByPreferences(
  alerts: HealthAlert[],
  preferences: {
    alertTypes?: {
      [key in AlertType]?: {
        enabled: boolean;
        urgencyLevels: AlertSeverity[];
      };
    };
  }
): HealthAlert[] {
  if (!preferences.alertTypes) {
    return alerts;
  }
  
  return alerts.filter(alert => {
    const typePrefs = preferences.alertTypes?.[alert.type];
    
    // If no preferences for this type, include it
    if (!typePrefs) {
      return true;
    }
    
    // Check if type is enabled
    if (!typePrefs.enabled) {
      return false;
    }
    
    // Check if severity level is included
    if (typePrefs.urgencyLevels && !typePrefs.urgencyLevels.includes(alert.severity)) {
      return false;
    }
    
    return true;
  });
}
