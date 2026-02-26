// Anomaly Detection for Vital Signs
// Requirements: 1.3 - Detect out-of-range vitals and trigger alerts

import { VitalSigns, AnomalyResult, AlertSeverity, BaselineVitals } from './types';

/**
 * Default normal ranges for vital signs
 */
const DEFAULT_NORMAL_RANGES = {
  heartRate: { min: 60, max: 100 },
  systolicBP: { min: 90, max: 140 },
  diastolicBP: { min: 60, max: 90 },
  temperature: { min: 97.0, max: 99.5 },
  oxygenSaturation: { min: 95, max: 100 },
  weight: { min: 100, max: 300 }, // This should be personalized
};

/**
 * Determine severity based on how far outside normal range
 */
function determineSeverity(value: number, min: number, max: number): AlertSeverity {
  const range = max - min;
  const deviation = Math.max(min - value, value - max, 0);
  const percentDeviation = (deviation / range) * 100;

  if (percentDeviation > 50) {
    return 'critical';
  } else if (percentDeviation > 25) {
    return 'high';
  } else if (percentDeviation > 10) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Generate description for anomaly
 */
function generateAnomalyDescription(
  metric: string,
  value: number,
  min: number,
  max: number,
  severity: AlertSeverity
): string {
  const metricName = metric.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  
  if (value < min) {
    return `${metricName} is below normal range (${value} < ${min}). Severity: ${severity}.`;
  } else if (value > max) {
    return `${metricName} is above normal range (${value} > ${max}). Severity: ${severity}.`;
  }
  
  return `${metricName} is within normal range.`;
}

/**
 * Detect anomalies in vital signs
 * Compares readings against baseline vitals and normal ranges
 */
export function detectAnomalies(
  vitals: VitalSigns,
  baselineVitals?: BaselineVitals
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // Use baseline vitals if provided, otherwise use default ranges
  const ranges = baselineVitals || {
    heartRate: DEFAULT_NORMAL_RANGES.heartRate,
    bloodPressure: {
      systolic: DEFAULT_NORMAL_RANGES.systolicBP,
      diastolic: DEFAULT_NORMAL_RANGES.diastolicBP,
    },
    temperature: DEFAULT_NORMAL_RANGES.temperature,
    oxygenSaturation: DEFAULT_NORMAL_RANGES.oxygenSaturation,
    weight: DEFAULT_NORMAL_RANGES.weight,
  };

  // Check heart rate
  if (vitals.heartRate !== undefined) {
    const { min, max } = ranges.heartRate;
    if (vitals.heartRate < min || vitals.heartRate > max) {
      const severity = determineSeverity(vitals.heartRate, min, max);
      anomalies.push({
        metric: 'heart_rate',
        value: vitals.heartRate,
        expectedRange: { min, max },
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('heartRate', vitals.heartRate, min, max, severity),
      });
    }
  }

  // Check blood pressure
  if (vitals.bloodPressure) {
    const { systolic, diastolic } = vitals.bloodPressure;
    const systolicRange = ranges.bloodPressure.systolic;
    const diastolicRange = ranges.bloodPressure.diastolic;

    if (systolic < systolicRange.min || systolic > systolicRange.max) {
      const severity = determineSeverity(systolic, systolicRange.min, systolicRange.max);
      anomalies.push({
        metric: 'systolic_blood_pressure',
        value: systolic,
        expectedRange: systolicRange,
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('systolicBP', systolic, systolicRange.min, systolicRange.max, severity),
      });
    }

    if (diastolic < diastolicRange.min || diastolic > diastolicRange.max) {
      const severity = determineSeverity(diastolic, diastolicRange.min, diastolicRange.max);
      anomalies.push({
        metric: 'diastolic_blood_pressure',
        value: diastolic,
        expectedRange: diastolicRange,
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('diastolicBP', diastolic, diastolicRange.min, diastolicRange.max, severity),
      });
    }
  }

  // Check temperature
  if (vitals.temperature !== undefined) {
    const { min, max } = ranges.temperature;
    if (vitals.temperature < min || vitals.temperature > max) {
      const severity = determineSeverity(vitals.temperature, min, max);
      anomalies.push({
        metric: 'temperature',
        value: vitals.temperature,
        expectedRange: { min, max },
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('temperature', vitals.temperature, min, max, severity),
      });
    }
  }

  // Check oxygen saturation
  if (vitals.oxygenSaturation !== undefined) {
    const { min, max } = ranges.oxygenSaturation;
    if (vitals.oxygenSaturation < min || vitals.oxygenSaturation > max) {
      const severity = determineSeverity(vitals.oxygenSaturation, min, max);
      anomalies.push({
        metric: 'oxygen_saturation',
        value: vitals.oxygenSaturation,
        expectedRange: { min, max },
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('oxygenSaturation', vitals.oxygenSaturation, min, max, severity),
      });
    }
  }

  // Check weight (if baseline is available)
  if (vitals.weight !== undefined && baselineVitals?.weight) {
    const { min, max } = baselineVitals.weight;
    if (vitals.weight < min || vitals.weight > max) {
      const severity = determineSeverity(vitals.weight, min, max);
      anomalies.push({
        metric: 'weight',
        value: vitals.weight,
        expectedRange: { min, max },
        severity,
        timestamp: vitals.timestamp,
        description: generateAnomalyDescription('weight', vitals.weight, min, max, severity),
      });
    }
  }

  return anomalies;
}

/**
 * Check if anomalies should trigger an alert
 * Returns true if any anomaly is medium severity or higher
 */
export function shouldTriggerAlert(anomalies: AnomalyResult[]): boolean {
  return anomalies.some(
    anomaly => anomaly.severity === 'medium' || anomaly.severity === 'high' || anomaly.severity === 'critical'
  );
}

/**
 * Get the highest severity from a list of anomalies
 */
export function getHighestSeverity(anomalies: AnomalyResult[]): AlertSeverity {
  if (anomalies.length === 0) return 'low';

  const severityOrder: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
  let highest: AlertSeverity = 'low';

  for (const anomaly of anomalies) {
    if (severityOrder.indexOf(anomaly.severity) > severityOrder.indexOf(highest)) {
      highest = anomaly.severity;
    }
  }

  return highest;
}
