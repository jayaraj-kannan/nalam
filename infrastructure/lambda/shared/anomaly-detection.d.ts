import { VitalSigns, AnomalyResult, AlertSeverity, BaselineVitals } from './types';
/**
 * Detect anomalies in vital signs
 * Compares readings against baseline vitals and normal ranges
 */
export declare function detectAnomalies(vitals: VitalSigns, baselineVitals?: BaselineVitals): AnomalyResult[];
/**
 * Check if anomalies should trigger an alert
 * Returns true if any anomaly is medium severity or higher
 */
export declare function shouldTriggerAlert(anomalies: AnomalyResult[]): boolean;
/**
 * Get the highest severity from a list of anomalies
 */
export declare function getHighestSeverity(anomalies: AnomalyResult[]): AlertSeverity;
