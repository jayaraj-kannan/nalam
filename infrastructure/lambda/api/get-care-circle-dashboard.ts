// Get Care Circle Dashboard Lambda Function
// Requirements: 4.1, 4.5
// Provides comprehensive health status dashboard for care circle members

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, VitalSigns } from '../shared/types';
import { checkPermission } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { getAppointmentsByUser } from '../shared/data-access/appointments';
import { getAlertsByUser } from '../shared/data-access/alerts';
import { queryTimestream } from '../shared/timestream-client';

interface DashboardData {
  primaryUser: {
    id: string;
    name: string;
    lastActive: string;
  };
  healthStatus: {
    latestVitals?: VitalSigns;
    vitalsTrend: 'improving' | 'stable' | 'declining' | 'concerning' | 'unknown';
    lastRecorded?: string;
  };
  medications: {
    upcomingCount: number;
    adherenceScore: number;
    missedToday: number;
  };
  appointments: {
    nextAppointment?: {
      provider: string;
      type: string;
      scheduledTime: string;
    };
    upcomingCount: number;
  };
  alerts: {
    unacknowledgedCount: number;
    criticalCount: number;
    recentAlerts: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: string;
    }>;
  };
}

/**
 * Get latest vital signs from Timestream
 */
async function getLatestVitals(userId: string): Promise<VitalSigns | undefined> {
  try {
    const query = `
      SELECT measure_name, measure_value::double as value, time
      FROM "${process.env.TIMESTREAM_DATABASE}"."${process.env.TIMESTREAM_TABLE}"
      WHERE userId = '${userId}'
        AND measure_name IN ('heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 
                             'temperature', 'oxygenSaturation', 'weight')
      ORDER BY time DESC
      LIMIT 10
    `;

    const results = await queryTimestream(query);
    
    if (results.length === 0) {
      return undefined;
    }

    // Group by latest timestamp
    const vitals: Partial<VitalSigns> = {
      timestamp: new Date(results[0].time),
      source: 'device',
    };

    for (const row of results) {
      switch (row.measure_name) {
        case 'heartRate':
          vitals.heartRate = row.value;
          break;
        case 'bloodPressureSystolic':
          if (!vitals.bloodPressure) vitals.bloodPressure = { systolic: 0, diastolic: 0 };
          vitals.bloodPressure.systolic = row.value;
          break;
        case 'bloodPressureDiastolic':
          if (!vitals.bloodPressure) vitals.bloodPressure = { systolic: 0, diastolic: 0 };
          vitals.bloodPressure.diastolic = row.value;
          break;
        case 'temperature':
          vitals.temperature = row.value;
          break;
        case 'oxygenSaturation':
          vitals.oxygenSaturation = row.value;
          break;
        case 'weight':
          vitals.weight = row.value;
          break;
      }
    }

    return vitals as VitalSigns;
  } catch (error) {
    console.error('Error getting latest vitals:', error);
    return undefined;
  }
}

/**
 * Calculate vitals trend
 */
async function calculateVitalsTrend(userId: string): Promise<'improving' | 'stable' | 'declining' | 'concerning' | 'unknown'> {
  try {
    const query = `
      SELECT measure_name, measure_value::double as value, time
      FROM "${process.env.TIMESTREAM_DATABASE}"."${process.env.TIMESTREAM_TABLE}"
      WHERE userId = '${userId}'
        AND time > ago(7d)
        AND measure_name IN ('heartRate', 'bloodPressureSystolic', 'oxygenSaturation')
      ORDER BY time DESC
    `;

    const results = await queryTimestream(query);
    
    if (results.length < 5) {
      return 'unknown';
    }

    // Simple trend analysis - check if recent values are within normal ranges
    let concerningCount = 0;
    for (const row of results.slice(0, 10)) {
      if (row.measure_name === 'heartRate' && (row.value < 60 || row.value > 100)) {
        concerningCount++;
      }
      if (row.measure_name === 'bloodPressureSystolic' && (row.value < 90 || row.value > 140)) {
        concerningCount++;
      }
      if (row.measure_name === 'oxygenSaturation' && row.value < 95) {
        concerningCount++;
      }
    }

    if (concerningCount > 5) return 'concerning';
    if (concerningCount > 2) return 'declining';
    return 'stable';
  } catch (error) {
    console.error('Error calculating vitals trend:', error);
    return 'unknown';
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from path parameters
    const primaryUserId = event.pathParameters?.userId;
    if (!primaryUserId) {
      return createErrorResponse(400, 'userId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Check if requesting user has permission to view dashboard
    if (requestingUserId !== primaryUserId) {
      const hasPermission = await checkPermission(primaryUserId, requestingUserId, 'canViewVitals');
      if (!hasPermission) {
        return createErrorResponse(403, 'You do not have permission to view this dashboard');
      }
    }

    // Get primary user information
    const primaryUser = await getUser(primaryUserId);
    if (!primaryUser) {
      return createErrorResponse(404, 'User not found');
    }

    // Get latest vitals and trend
    const latestVitals = await getLatestVitals(primaryUserId);
    const vitalsTrend = await calculateVitalsTrend(primaryUserId);

    // Get medications data
    const medications = await getMedicationsByUser(primaryUserId);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    
    const upcomingMedications = medications.filter(
      med => med.status === 'scheduled' && med.scheduledTime >= now && med.scheduledTime <= tomorrow
    );
    
    const missedToday = medications.filter(
      med => med.status === 'missed' && med.scheduledTime >= todayStart && med.scheduledTime <= now
    );

    // Calculate adherence score (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentMeds = medications.filter(med => med.scheduledTime >= weekAgo);
    const takenCount = recentMeds.filter(med => med.status === 'taken').length;
    const adherenceScore = recentMeds.length > 0 ? Math.round((takenCount / recentMeds.length) * 100) : 100;

    // Get appointments data
    const appointments = await getAppointmentsByUser(primaryUserId);
    const upcomingAppointments = appointments
      .filter(apt => apt.status === 'scheduled' && apt.scheduledTime >= now)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    const nextAppointment = upcomingAppointments[0];

    // Get alerts data
    const alerts = await getAlertsByUser(primaryUserId);
    const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
    const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'critical');
    const recentAlerts = alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
      .map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
      }));

    // Build dashboard data
    const dashboard: DashboardData = {
      primaryUser: {
        id: primaryUserId,
        name: `${primaryUser.profile.firstName} ${primaryUser.profile.lastName}`,
        lastActive: primaryUser.lastActive.toISOString(),
      },
      healthStatus: {
        latestVitals,
        vitalsTrend,
        lastRecorded: latestVitals?.timestamp.toISOString(),
      },
      medications: {
        upcomingCount: upcomingMedications.length,
        adherenceScore,
        missedToday: missedToday.length,
      },
      appointments: {
        nextAppointment: nextAppointment ? {
          provider: nextAppointment.provider.name,
          type: nextAppointment.type,
          scheduledTime: nextAppointment.scheduledTime.toISOString(),
        } : undefined,
        upcomingCount: upcomingAppointments.length,
      },
      alerts: {
        unacknowledgedCount: unacknowledgedAlerts.length,
        criticalCount: criticalAlerts.length,
        recentAlerts,
      },
    };

    return createSuccessResponse({
      dashboard,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting care circle dashboard:', error);
    return createErrorResponse(500, 'Failed to retrieve dashboard data');
  }
}
