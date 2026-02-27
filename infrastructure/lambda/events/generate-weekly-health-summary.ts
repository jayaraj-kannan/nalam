// Generate Weekly Health Summary Lambda Function
// Requirements: 4.3
// Generates and sends weekly health summaries to care circle members

import { ScheduledEvent } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getUser } from '../shared/data-access/users';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { getAppointmentsByUser } from '../shared/data-access/appointments';
import { getAlertsByUser } from '../shared/data-access/alerts';
import { queryTimestream } from '../shared/timestream-client';
import { VitalSigns } from '../shared/types';

const sesClient = new SESClient({});

interface WeeklySummary {
  primaryUser: {
    name: string;
    id: string;
  };
  period: {
    start: string;
    end: string;
  };
  vitals: {
    averageHeartRate?: number;
    averageBloodPressure?: { systolic: number; diastolic: number };
    averageOxygenSaturation?: number;
    readingsCount: number;
    trend: string;
  };
  medications: {
    adherenceScore: number;
    totalScheduled: number;
    totalTaken: number;
    totalMissed: number;
  };
  appointments: {
    completed: number;
    upcoming: number;
    missed: number;
  };
  alerts: {
    total: number;
    critical: number;
    byType: Record<string, number>;
  };
  highlights: string[];
  concerns: string[];
}

/**
 * Get vital signs statistics for the week
 */
async function getVitalsStatistics(userId: string, startDate: Date, endDate: Date): Promise<WeeklySummary['vitals']> {
  try {
    const query = `
      SELECT measure_name, AVG(measure_value::double) as avg_value, COUNT(*) as count
      FROM "${process.env.TIMESTREAM_DATABASE}"."${process.env.TIMESTREAM_TABLE}"
      WHERE userId = '${userId}'
        AND time BETWEEN from_iso8601_timestamp('${startDate.toISOString()}') 
                     AND from_iso8601_timestamp('${endDate.toISOString()}')
        AND measure_name IN ('heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'oxygenSaturation')
      GROUP BY measure_name
    `;

    const results = await queryTimestream(query);
    
    const stats: any = {
      readingsCount: 0,
      trend: 'stable',
    };

    for (const row of results) {
      stats.readingsCount += row.count;
      
      switch (row.measure_name) {
        case 'heartRate':
          stats.averageHeartRate = Math.round(row.avg_value);
          break;
        case 'bloodPressureSystolic':
          if (!stats.averageBloodPressure) stats.averageBloodPressure = { systolic: 0, diastolic: 0 };
          stats.averageBloodPressure.systolic = Math.round(row.avg_value);
          break;
        case 'bloodPressureDiastolic':
          if (!stats.averageBloodPressure) stats.averageBloodPressure = { systolic: 0, diastolic: 0 };
          stats.averageBloodPressure.diastolic = Math.round(row.avg_value);
          break;
        case 'oxygenSaturation':
          stats.averageOxygenSaturation = Math.round(row.avg_value);
          break;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting vitals statistics:', error);
    return { readingsCount: 0, trend: 'unknown' };
  }
}

/**
 * Generate highlights and concerns
 */
function generateInsights(summary: WeeklySummary): { highlights: string[]; concerns: string[] } {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Medication adherence
  if (summary.medications.adherenceScore >= 90) {
    highlights.push(`Excellent medication adherence at ${summary.medications.adherenceScore}%`);
  } else if (summary.medications.adherenceScore < 80) {
    concerns.push(`Low medication adherence at ${summary.medications.adherenceScore}% - ${summary.medications.totalMissed} doses missed`);
  }

  // Vital signs
  if (summary.vitals.readingsCount > 14) {
    highlights.push(`Consistent health monitoring with ${summary.vitals.readingsCount} vital sign readings`);
  } else if (summary.vitals.readingsCount < 7) {
    concerns.push(`Limited health monitoring - only ${summary.vitals.readingsCount} readings this week`);
  }

  // Heart rate
  if (summary.vitals.averageHeartRate) {
    if (summary.vitals.averageHeartRate >= 60 && summary.vitals.averageHeartRate <= 100) {
      highlights.push(`Heart rate within normal range (avg: ${summary.vitals.averageHeartRate} bpm)`);
    } else {
      concerns.push(`Heart rate outside normal range (avg: ${summary.vitals.averageHeartRate} bpm)`);
    }
  }

  // Blood pressure
  if (summary.vitals.averageBloodPressure) {
    const { systolic, diastolic } = summary.vitals.averageBloodPressure;
    if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
      highlights.push(`Blood pressure within normal range (avg: ${systolic}/${diastolic})`);
    } else {
      concerns.push(`Blood pressure outside normal range (avg: ${systolic}/${diastolic})`);
    }
  }

  // Oxygen saturation
  if (summary.vitals.averageOxygenSaturation) {
    if (summary.vitals.averageOxygenSaturation >= 95) {
      highlights.push(`Oxygen saturation healthy (avg: ${summary.vitals.averageOxygenSaturation}%)`);
    } else {
      concerns.push(`Low oxygen saturation (avg: ${summary.vitals.averageOxygenSaturation}%)`);
    }
  }

  // Appointments
  if (summary.appointments.missed > 0) {
    concerns.push(`${summary.appointments.missed} missed appointment${summary.appointments.missed > 1 ? 's' : ''}`);
  }

  // Alerts
  if (summary.alerts.critical > 0) {
    concerns.push(`${summary.alerts.critical} critical alert${summary.alerts.critical > 1 ? 's' : ''} this week`);
  }

  return { highlights, concerns };
}

/**
 * Generate HTML email for weekly summary
 */
function generateEmailHTML(summary: WeeklySummary): string {
  const highlightsHTML = summary.highlights.length > 0
    ? `<ul>${summary.highlights.map(h => `<li style="color: #2e7d32;">${h}</li>`).join('')}</ul>`
    : '<p style="color: #666;">No highlights this week</p>';

  const concernsHTML = summary.concerns.length > 0
    ? `<ul>${summary.concerns.map(c => `<li style="color: #d32f2f;">${c}</li>`).join('')}</ul>`
    : '<p style="color: #666;">No concerns this week</p>';

  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Weekly Health Summary</h1>
        <h2 style="color: #333;">${summary.primaryUser.name}</h2>
        <p style="color: #666;">
          Period: ${new Date(summary.period.start).toLocaleDateString()} - ${new Date(summary.period.end).toLocaleDateString()}
        </p>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📊 Vital Signs</h3>
          <p><strong>Total Readings:</strong> ${summary.vitals.readingsCount}</p>
          ${summary.vitals.averageHeartRate ? `<p><strong>Average Heart Rate:</strong> ${summary.vitals.averageHeartRate} bpm</p>` : ''}
          ${summary.vitals.averageBloodPressure ? `<p><strong>Average Blood Pressure:</strong> ${summary.vitals.averageBloodPressure.systolic}/${summary.vitals.averageBloodPressure.diastolic} mmHg</p>` : ''}
          ${summary.vitals.averageOxygenSaturation ? `<p><strong>Average Oxygen Saturation:</strong> ${summary.vitals.averageOxygenSaturation}%</p>` : ''}
        </div>

        <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">💊 Medications</h3>
          <p><strong>Adherence Score:</strong> ${summary.medications.adherenceScore}%</p>
          <p><strong>Scheduled:</strong> ${summary.medications.totalScheduled} | <strong>Taken:</strong> ${summary.medications.totalTaken} | <strong>Missed:</strong> ${summary.medications.totalMissed}</p>
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📅 Appointments</h3>
          <p><strong>Completed:</strong> ${summary.appointments.completed} | <strong>Upcoming:</strong> ${summary.appointments.upcoming} | <strong>Missed:</strong> ${summary.appointments.missed}</p>
        </div>

        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">🚨 Alerts</h3>
          <p><strong>Total Alerts:</strong> ${summary.alerts.total} | <strong>Critical:</strong> ${summary.alerts.critical}</p>
        </div>

        <div style="margin: 30px 0;">
          <h3 style="color: #2e7d32;">✅ Highlights</h3>
          ${highlightsHTML}
        </div>

        <div style="margin: 30px 0;">
          <h3 style="color: #d32f2f;">⚠️ Concerns</h3>
          ${concernsHTML}
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          This is an automated weekly health summary from Healthcare Monitoring App.
        </p>
      </body>
    </html>
  `;
}

/**
 * Generate and send weekly summary for a primary user
 */
async function generateSummaryForUser(primaryUserId: string): Promise<void> {
  try {
    console.log(`Generating weekly summary for user: ${primaryUserId}`);

    // Get primary user
    const primaryUser = await getUser(primaryUserId);
    if (!primaryUser) {
      console.error(`User not found: ${primaryUserId}`);
      return;
    }

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get vitals statistics
    const vitals = await getVitalsStatistics(primaryUserId, startDate, endDate);

    // Get medications data
    const medications = await getMedicationsByUser(primaryUserId);
    const weekMedications = medications.filter(
      med => med.scheduledTime >= startDate && med.scheduledTime <= endDate
    );
    const takenCount = weekMedications.filter(med => med.status === 'taken').length;
    const missedCount = weekMedications.filter(med => med.status === 'missed').length;
    const adherenceScore = weekMedications.length > 0 
      ? Math.round((takenCount / weekMedications.length) * 100) 
      : 100;

    // Get appointments data
    const appointments = await getAppointmentsByUser(primaryUserId);
    const weekAppointments = appointments.filter(
      apt => apt.scheduledTime >= startDate && apt.scheduledTime <= endDate
    );
    const completedAppointments = weekAppointments.filter(apt => apt.status === 'completed').length;
    const missedAppointments = weekAppointments.filter(apt => apt.status === 'missed').length;
    const upcomingAppointments = appointments.filter(
      apt => apt.status === 'scheduled' && apt.scheduledTime > endDate
    ).length;

    // Get alerts data
    const alerts = await getAlertsByUser(primaryUserId);
    const weekAlerts = alerts.filter(
      alert => alert.timestamp >= startDate && alert.timestamp <= endDate
    );
    const criticalAlerts = weekAlerts.filter(alert => alert.severity === 'critical').length;
    const alertsByType: Record<string, number> = {};
    weekAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    // Build summary
    const summary: WeeklySummary = {
      primaryUser: {
        name: `${primaryUser.profile.firstName} ${primaryUser.profile.lastName}`,
        id: primaryUserId,
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      vitals,
      medications: {
        adherenceScore,
        totalScheduled: weekMedications.length,
        totalTaken: takenCount,
        totalMissed: missedCount,
      },
      appointments: {
        completed: completedAppointments,
        upcoming: upcomingAppointments,
        missed: missedAppointments,
      },
      alerts: {
        total: weekAlerts.length,
        critical: criticalAlerts,
        byType: alertsByType,
      },
      highlights: [],
      concerns: [],
    };

    // Generate insights
    const insights = generateInsights(summary);
    summary.highlights = insights.highlights;
    summary.concerns = insights.concerns;

    // Get care circle members
    const careCircleMembers = await getCareCircleMembers(primaryUserId);

    // Send email to each care circle member
    for (const member of careCircleMembers) {
      const secondaryUser = await getUser(member.secondaryUserId);
      if (!secondaryUser) continue;

      const emailHTML = generateEmailHTML(summary);

      await sesClient.send(new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL || 'noreply@healthcare-monitoring.com',
        Destination: {
          ToAddresses: [secondaryUser.profile.email],
        },
        Message: {
          Subject: {
            Data: `Weekly Health Summary: ${summary.primaryUser.name}`,
          },
          Body: {
            Html: {
              Data: emailHTML,
            },
          },
        },
      }));

      console.log(`Sent weekly summary to: ${secondaryUser.profile.email}`);
    }

    console.log(`Successfully generated and sent weekly summary for user: ${primaryUserId}`);
  } catch (error) {
    console.error(`Error generating summary for user ${primaryUserId}:`, error);
  }
}

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Starting weekly health summary generation');

  try {
    // In a real implementation, we would query all primary users
    // For now, this would be triggered by EventBridge for each user
    const primaryUserId = process.env.PRIMARY_USER_ID;
    
    if (primaryUserId) {
      await generateSummaryForUser(primaryUserId);
    } else {
      console.log('No PRIMARY_USER_ID specified in environment');
    }

    console.log('Weekly health summary generation completed');
  } catch (error) {
    console.error('Error in weekly health summary generation:', error);
    throw error;
  }
}
