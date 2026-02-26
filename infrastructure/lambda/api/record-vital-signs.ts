// Record Vital Signs API Endpoint
// Requirements: 1.1, 1.4 - Store vital signs with timestamp and validation

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, VitalSigns } from '../shared/types';
import { writeVitalSigns } from '../shared/timestream-client';
import { logDataAccess } from '../shared/audit-logger';
import { detectAnomalies, shouldTriggerAlert, getHighestSeverity } from '../shared/anomaly-detection';
import { getUser } from '../shared/data-access/users';

/**
 * Normal ranges for vital signs validation
 */
const VITAL_RANGES = {
  heartRate: { min: 40, max: 200, unit: 'bpm' },
  systolicBP: { min: 70, max: 200, unit: 'mmHg' },
  diastolicBP: { min: 40, max: 130, unit: 'mmHg' },
  temperature: { min: 95.0, max: 105.0, unit: 'F' },
  oxygenSaturation: { min: 70, max: 100, unit: '%' },
  weight: { min: 50, max: 500, unit: 'lbs' },
};

/**
 * Validate vital signs against acceptable ranges
 */
function validateVitalSigns(vitals: VitalSigns): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (vitals.heartRate !== undefined) {
    if (vitals.heartRate < VITAL_RANGES.heartRate.min || vitals.heartRate > VITAL_RANGES.heartRate.max) {
      errors.push(
        `Heart rate must be between ${VITAL_RANGES.heartRate.min} and ${VITAL_RANGES.heartRate.max} ${VITAL_RANGES.heartRate.unit}`
      );
    }
  }

  if (vitals.bloodPressure) {
    if (
      vitals.bloodPressure.systolic < VITAL_RANGES.systolicBP.min ||
      vitals.bloodPressure.systolic > VITAL_RANGES.systolicBP.max
    ) {
      errors.push(
        `Systolic blood pressure must be between ${VITAL_RANGES.systolicBP.min} and ${VITAL_RANGES.systolicBP.max} ${VITAL_RANGES.systolicBP.unit}`
      );
    }
    if (
      vitals.bloodPressure.diastolic < VITAL_RANGES.diastolicBP.min ||
      vitals.bloodPressure.diastolic > VITAL_RANGES.diastolicBP.max
    ) {
      errors.push(
        `Diastolic blood pressure must be between ${VITAL_RANGES.diastolicBP.min} and ${VITAL_RANGES.diastolicBP.max} ${VITAL_RANGES.diastolicBP.unit}`
      );
    }
  }

  if (vitals.temperature !== undefined) {
    if (vitals.temperature < VITAL_RANGES.temperature.min || vitals.temperature > VITAL_RANGES.temperature.max) {
      errors.push(
        `Temperature must be between ${VITAL_RANGES.temperature.min} and ${VITAL_RANGES.temperature.max} ${VITAL_RANGES.temperature.unit}`
      );
    }
  }

  if (vitals.oxygenSaturation !== undefined) {
    if (
      vitals.oxygenSaturation < VITAL_RANGES.oxygenSaturation.min ||
      vitals.oxygenSaturation > VITAL_RANGES.oxygenSaturation.max
    ) {
      errors.push(
        `Oxygen saturation must be between ${VITAL_RANGES.oxygenSaturation.min} and ${VITAL_RANGES.oxygenSaturation.max} ${VITAL_RANGES.oxygenSaturation.unit}`
      );
    }
  }

  if (vitals.weight !== undefined) {
    if (vitals.weight < VITAL_RANGES.weight.min || vitals.weight > VITAL_RANGES.weight.max) {
      errors.push(
        `Weight must be between ${VITAL_RANGES.weight.min} and ${VITAL_RANGES.weight.max} ${VITAL_RANGES.weight.unit}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Record vital signs for a user
 * POST /api/v1/health/vitals
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract user info from authorizer context
    const userId = event.requestContext.authorizer?.principalId;
    const userType = event.requestContext.authorizer?.userType as 'primary' | 'secondary';

    if (!userId || !userType) {
      return createErrorResponse(401, 'Unauthorized: Missing user context');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Missing request body');
    }

    const body = JSON.parse(event.body);
    const { vitals, deviceId } = body;

    if (!vitals) {
      return createErrorResponse(400, 'Missing vitals data');
    }

    // Determine target user ID (primary user records for themselves, secondary user cannot record)
    let targetUserId = userId;
    if (userType === 'secondary') {
      // Secondary users cannot record vital signs
      return createErrorResponse(403, 'Forbidden: Secondary users cannot record vital signs');
    }

    // Generate timestamp
    const timestamp = new Date();

    // Construct VitalSigns object
    const vitalSigns: VitalSigns = {
      heartRate: vitals.heartRate,
      bloodPressure: vitals.bloodPressure
        ? {
            systolic: vitals.bloodPressure.systolic,
            diastolic: vitals.bloodPressure.diastolic,
          }
        : undefined,
      temperature: vitals.temperature,
      oxygenSaturation: vitals.oxygenSaturation,
      weight: vitals.weight,
      timestamp,
      source: deviceId ? 'device' : 'manual',
    };

    // Validate vital signs
    const validation = validateVitalSigns(vitalSigns);
    if (!validation.valid) {
      return createErrorResponse(400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    // Get user's baseline vitals for anomaly detection
    const user = await getUser(targetUserId);
    const baselineVitals = user?.healthProfile?.baselineVitals;

    // Detect anomalies
    const anomalies = detectAnomalies(vitalSigns, baselineVitals);
    const hasAnomalies = anomalies.length > 0;
    const shouldAlert = shouldTriggerAlert(anomalies);

    // Store in Timestream
    await writeVitalSigns(
      targetUserId,
      {
        heartRate: vitalSigns.heartRate,
        systolicBP: vitalSigns.bloodPressure?.systolic,
        diastolicBP: vitalSigns.bloodPressure?.diastolic,
        temperature: vitalSigns.temperature,
        oxygenSaturation: vitalSigns.oxygenSaturation,
        weight: vitalSigns.weight,
      },
      timestamp,
      vitalSigns.source
    );

    // Log data access
    await logDataAccess(userId, userType, targetUserId, 'vitals', 'write', true, ['vitals'], {
      source: vitalSigns.source,
      deviceId,
      timestamp: timestamp.toISOString(),
      anomaliesDetected: hasAnomalies,
      alertTriggered: shouldAlert,
    });

    // TODO: Trigger alert generation if anomalies detected (will be implemented in task 6)
    // This will be handled by the Alert Management Service

    return createSuccessResponse({
      message: 'Vital signs recorded successfully',
      userId: targetUserId,
      timestamp: timestamp.toISOString(),
      vitals: vitalSigns,
      anomalies: hasAnomalies ? anomalies : undefined,
      alertTriggered: shouldAlert,
    });
  } catch (error) {
    console.error('Record vital signs error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
