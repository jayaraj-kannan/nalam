"use strict";
// Generate Weekly Health Summary Lambda Function
// Requirements: 4.3
// Generates and sends weekly health summaries to care circle members
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_ses_1 = require("@aws-sdk/client-ses");
const users_1 = require("../shared/data-access/users");
const care_circle_1 = require("../shared/data-access/care-circle");
const medications_1 = require("../shared/data-access/medications");
const appointments_1 = require("../shared/data-access/appointments");
const alerts_1 = require("../shared/data-access/alerts");
const timestream_client_1 = require("../shared/timestream-client");
const sesClient = new client_ses_1.SESClient({});
/**
 * Get vital signs statistics for the week
 */
async function getVitalsStatistics(userId, startDate, endDate) {
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
        const results = await (0, timestream_client_1.queryTimestream)(query);
        const stats = {
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
                    if (!stats.averageBloodPressure)
                        stats.averageBloodPressure = { systolic: 0, diastolic: 0 };
                    stats.averageBloodPressure.systolic = Math.round(row.avg_value);
                    break;
                case 'bloodPressureDiastolic':
                    if (!stats.averageBloodPressure)
                        stats.averageBloodPressure = { systolic: 0, diastolic: 0 };
                    stats.averageBloodPressure.diastolic = Math.round(row.avg_value);
                    break;
                case 'oxygenSaturation':
                    stats.averageOxygenSaturation = Math.round(row.avg_value);
                    break;
            }
        }
        return stats;
    }
    catch (error) {
        console.error('Error getting vitals statistics:', error);
        return { readingsCount: 0, trend: 'unknown' };
    }
}
/**
 * Generate highlights and concerns
 */
function generateInsights(summary) {
    const highlights = [];
    const concerns = [];
    // Medication adherence
    if (summary.medications.adherenceScore >= 90) {
        highlights.push(`Excellent medication adherence at ${summary.medications.adherenceScore}%`);
    }
    else if (summary.medications.adherenceScore < 80) {
        concerns.push(`Low medication adherence at ${summary.medications.adherenceScore}% - ${summary.medications.totalMissed} doses missed`);
    }
    // Vital signs
    if (summary.vitals.readingsCount > 14) {
        highlights.push(`Consistent health monitoring with ${summary.vitals.readingsCount} vital sign readings`);
    }
    else if (summary.vitals.readingsCount < 7) {
        concerns.push(`Limited health monitoring - only ${summary.vitals.readingsCount} readings this week`);
    }
    // Heart rate
    if (summary.vitals.averageHeartRate) {
        if (summary.vitals.averageHeartRate >= 60 && summary.vitals.averageHeartRate <= 100) {
            highlights.push(`Heart rate within normal range (avg: ${summary.vitals.averageHeartRate} bpm)`);
        }
        else {
            concerns.push(`Heart rate outside normal range (avg: ${summary.vitals.averageHeartRate} bpm)`);
        }
    }
    // Blood pressure
    if (summary.vitals.averageBloodPressure) {
        const { systolic, diastolic } = summary.vitals.averageBloodPressure;
        if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
            highlights.push(`Blood pressure within normal range (avg: ${systolic}/${diastolic})`);
        }
        else {
            concerns.push(`Blood pressure outside normal range (avg: ${systolic}/${diastolic})`);
        }
    }
    // Oxygen saturation
    if (summary.vitals.averageOxygenSaturation) {
        if (summary.vitals.averageOxygenSaturation >= 95) {
            highlights.push(`Oxygen saturation healthy (avg: ${summary.vitals.averageOxygenSaturation}%)`);
        }
        else {
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
function generateEmailHTML(summary) {
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
async function generateSummaryForUser(primaryUserId) {
    try {
        console.log(`Generating weekly summary for user: ${primaryUserId}`);
        // Get primary user
        const primaryUser = await (0, users_1.getUser)(primaryUserId);
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
        const medications = await (0, medications_1.getMedicationsByUser)(primaryUserId);
        const weekMedications = medications.filter(med => med.scheduledTime >= startDate && med.scheduledTime <= endDate);
        const takenCount = weekMedications.filter(med => med.status === 'taken').length;
        const missedCount = weekMedications.filter(med => med.status === 'missed').length;
        const adherenceScore = weekMedications.length > 0
            ? Math.round((takenCount / weekMedications.length) * 100)
            : 100;
        // Get appointments data
        const appointments = await (0, appointments_1.getAppointmentsByUser)(primaryUserId);
        const weekAppointments = appointments.filter(apt => apt.scheduledTime >= startDate && apt.scheduledTime <= endDate);
        const completedAppointments = weekAppointments.filter(apt => apt.status === 'completed').length;
        const missedAppointments = weekAppointments.filter(apt => apt.status === 'missed').length;
        const upcomingAppointments = appointments.filter(apt => apt.status === 'scheduled' && apt.scheduledTime > endDate).length;
        // Get alerts data
        const alerts = await (0, alerts_1.getAlertsByUser)(primaryUserId);
        const weekAlerts = alerts.filter(alert => alert.timestamp >= startDate && alert.timestamp <= endDate);
        const criticalAlerts = weekAlerts.filter(alert => alert.severity === 'critical').length;
        const alertsByType = {};
        weekAlerts.forEach(alert => {
            alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
        });
        // Build summary
        const summary = {
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
        const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(primaryUserId);
        // Send email to each care circle member
        for (const member of careCircleMembers) {
            const secondaryUser = await (0, users_1.getUser)(member.secondaryUserId);
            if (!secondaryUser)
                continue;
            const emailHTML = generateEmailHTML(summary);
            await sesClient.send(new client_ses_1.SendEmailCommand({
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
    }
    catch (error) {
        console.error(`Error generating summary for user ${primaryUserId}:`, error);
    }
}
async function handler(event) {
    console.log('Starting weekly health summary generation');
    try {
        // In a real implementation, we would query all primary users
        // For now, this would be triggered by EventBridge for each user
        const primaryUserId = process.env.PRIMARY_USER_ID;
        if (primaryUserId) {
            await generateSummaryForUser(primaryUserId);
        }
        else {
            console.log('No PRIMARY_USER_ID specified in environment');
        }
        console.log('Weekly health summary generation completed');
    }
    catch (error) {
        console.error('Error in weekly health summary generation:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtd2Vla2x5LWhlYWx0aC1zdW1tYXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGUtd2Vla2x5LWhlYWx0aC1zdW1tYXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpREFBaUQ7QUFDakQsb0JBQW9CO0FBQ3BCLHFFQUFxRTs7QUFnV3JFLDBCQW1CQztBQWhYRCxvREFBa0U7QUFDbEUsdURBQXNEO0FBQ3RELG1FQUF5RTtBQUN6RSxtRUFBeUU7QUFDekUscUVBQTJFO0FBQzNFLHlEQUErRDtBQUMvRCxtRUFBOEQ7QUFHOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBc0NwQzs7R0FFRztBQUNILEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxNQUFjLEVBQUUsU0FBZSxFQUFFLE9BQWE7SUFDL0UsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUc7O2NBRUosT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQjt3QkFDdkQsTUFBTTttREFDcUIsU0FBUyxDQUFDLFdBQVcsRUFBRTttREFDdkIsT0FBTyxDQUFDLFdBQVcsRUFBRTs7O0tBR25FLENBQUM7UUFFRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUEsbUNBQWUsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLEtBQUssR0FBUTtZQUNqQixhQUFhLEVBQUUsQ0FBQztZQUNoQixLQUFLLEVBQUUsUUFBUTtTQUNoQixDQUFDO1FBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMxQixLQUFLLENBQUMsYUFBYSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUM7WUFFakMsUUFBUSxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssV0FBVztvQkFDZCxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FB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QyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDREQUE0RCxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsYUFBYSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUUsQ0FBQztBQUNILENBQUM7QUFFTSxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQXFCO0lBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQztJQUV6RCxJQUFJLENBQUM7UUFDSCw2REFBNkQ7UUFDN0QsZ0VBQWdFO1FBQ2hFLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO1FBRWxELElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEIsTUFBTSxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRSxNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2VuZXJhdGUgV2Vla2x5IEhlYWx0aCBTdW1tYXJ5IExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjNcbi8vIEdlbmVyYXRlcyBhbmQgc2VuZHMgd2Vla2x5IGhlYWx0aCBzdW1tYXJpZXMgdG8gY2FyZSBjaXJjbGUgbWVtYmVyc1xuXG5pbXBvcnQgeyBTY2hlZHVsZWRFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgU0VTQ2xpZW50LCBTZW5kRW1haWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlcyc7XG5pbXBvcnQgeyBnZXRVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXJzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGdldE1lZGljYXRpb25zQnlVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL21lZGljYXRpb25zJztcbmltcG9ydCB7IGdldEFwcG9pbnRtZW50c0J5VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgZ2V0QWxlcnRzQnlVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FsZXJ0cyc7XG5pbXBvcnQgeyBxdWVyeVRpbWVzdHJlYW0gfSBmcm9tICcuLi9zaGFyZWQvdGltZXN0cmVhbS1jbGllbnQnO1xuaW1wb3J0IHsgVml0YWxTaWducyB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5cbmNvbnN0IHNlc0NsaWVudCA9IG5ldyBTRVNDbGllbnQoe30pO1xuXG5pbnRlcmZhY2UgV2Vla2x5U3VtbWFyeSB7XG4gIHByaW1hcnlVc2VyOiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGlkOiBzdHJpbmc7XG4gIH07XG4gIHBlcmlvZDoge1xuICAgIHN0YXJ0OiBzdHJpbmc7XG4gICAgZW5kOiBzdHJpbmc7XG4gIH07XG4gIHZpdGFsczoge1xuICAgIGF2ZXJhZ2VIZWFydFJhdGU/OiBudW1iZXI7XG4gICAgYXZlcmFnZUJsb29kUHJlc3N1cmU/OiB7IHN5c3RvbGljOiBudW1iZXI7IGRpYXN0b2xpYzogbnVtYmVyIH07XG4gICAgYXZlcmFnZU94eWdlblNhdHVyYXRpb24/OiBudW1iZXI7XG4gICAgcmVhZGluZ3NDb3VudDogbnVtYmVyO1xuICAgIHRyZW5kOiBzdHJpbmc7XG4gIH07XG4gIG1lZGljYXRpb25zOiB7XG4gICAgYWRoZXJlbmNlU2NvcmU6IG51bWJlcjtcbiAgICB0b3RhbFNjaGVkdWxlZDogbnVtYmVyO1xuICAgIHRvdGFsVGFrZW46IG51bWJlcjtcbiAgICB0b3RhbE1pc3NlZDogbnVtYmVyO1xuICB9O1xuICBhcHBvaW50bWVudHM6IHtcbiAgICBjb21wbGV0ZWQ6IG51bWJlcjtcbiAgICB1cGNvbWluZzogbnVtYmVyO1xuICAgIG1pc3NlZDogbnVtYmVyO1xuICB9O1xuICBhbGVydHM6IHtcbiAgICB0b3RhbDogbnVtYmVyO1xuICAgIGNyaXRpY2FsOiBudW1iZXI7XG4gICAgYnlUeXBlOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+O1xuICB9O1xuICBoaWdobGlnaHRzOiBzdHJpbmdbXTtcbiAgY29uY2VybnM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEdldCB2aXRhbCBzaWducyBzdGF0aXN0aWNzIGZvciB0aGUgd2Vla1xuICovXG5hc3luYyBmdW5jdGlvbiBnZXRWaXRhbHNTdGF0aXN0aWNzKHVzZXJJZDogc3RyaW5nLCBzdGFydERhdGU6IERhdGUsIGVuZERhdGU6IERhdGUpOiBQcm9taXNlPFdlZWtseVN1bW1hcnlbJ3ZpdGFscyddPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcXVlcnkgPSBgXG4gICAgICBTRUxFQ1QgbWVhc3VyZV9uYW1lLCBBVkcobWVhc3VyZV92YWx1ZTo6ZG91YmxlKSBhcyBhdmdfdmFsdWUsIENPVU5UKCopIGFzIGNvdW50XG4gICAgICBGUk9NIFwiJHtwcm9jZXNzLmVudi5USU1FU1RSRUFNX0RBVEFCQVNFfVwiLlwiJHtwcm9jZXNzLmVudi5USU1FU1RSRUFNX1RBQkxFfVwiXG4gICAgICBXSEVSRSB1c2VySWQgPSAnJHt1c2VySWR9J1xuICAgICAgICBBTkQgdGltZSBCRVRXRUVOIGZyb21faXNvODYwMV90aW1lc3RhbXAoJyR7c3RhcnREYXRlLnRvSVNPU3RyaW5nKCl9JykgXG4gICAgICAgICAgICAgICAgICAgICBBTkQgZnJvbV9pc284NjAxX3RpbWVzdGFtcCgnJHtlbmREYXRlLnRvSVNPU3RyaW5nKCl9JylcbiAgICAgICAgQU5EIG1lYXN1cmVfbmFtZSBJTiAoJ2hlYXJ0UmF0ZScsICdibG9vZFByZXNzdXJlU3lzdG9saWMnLCAnYmxvb2RQcmVzc3VyZURpYXN0b2xpYycsICdveHlnZW5TYXR1cmF0aW9uJylcbiAgICAgIEdST1VQIEJZIG1lYXN1cmVfbmFtZVxuICAgIGA7XG5cbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcXVlcnlUaW1lc3RyZWFtKHF1ZXJ5KTtcbiAgICBcbiAgICBjb25zdCBzdGF0czogYW55ID0ge1xuICAgICAgcmVhZGluZ3NDb3VudDogMCxcbiAgICAgIHRyZW5kOiAnc3RhYmxlJyxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCByb3cgb2YgcmVzdWx0cykge1xuICAgICAgc3RhdHMucmVhZGluZ3NDb3VudCArPSByb3cuY291bnQ7XG4gICAgICBcbiAgICAgIHN3aXRjaCAocm93Lm1lYXN1cmVfbmFtZSkge1xuICAgICAgICBjYXNlICdoZWFydFJhdGUnOlxuICAgICAgICAgIHN0YXRzLmF2ZXJhZ2VIZWFydFJhdGUgPSBNYXRoLnJvdW5kKHJvdy5hdmdfdmFsdWUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdibG9vZFByZXNzdXJlU3lzdG9saWMnOlxuICAgICAgICAgIGlmICghc3RhdHMuYXZlcmFnZUJsb29kUHJlc3N1cmUpIHN0YXRzLmF2ZXJhZ2VCbG9vZFByZXNzdXJlID0geyBzeXN0b2xpYzogMCwgZGlhc3RvbGljOiAwIH07XG4gICAgICAgICAgc3RhdHMuYXZlcmFnZUJsb29kUHJlc3N1cmUuc3lzdG9saWMgPSBNYXRoLnJvdW5kKHJvdy5hdmdfdmFsdWUpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdibG9vZFByZXNzdXJlRGlhc3RvbGljJzpcbiAgICAgICAgICBpZiAoIXN0YXRzLmF2ZXJhZ2VCbG9vZFByZXNzdXJlKSBzdGF0cy5hdmVyYWdlQmxvb2RQcmVzc3VyZSA9IHsgc3lzdG9saWM6IDAsIGRpYXN0b2xpYzogMCB9O1xuICAgICAgICAgIHN0YXRzLmF2ZXJhZ2VCbG9vZFByZXNzdXJlLmRpYXN0b2xpYyA9IE1hdGgucm91bmQocm93LmF2Z192YWx1ZSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ294eWdlblNhdHVyYXRpb24nOlxuICAgICAgICAgIHN0YXRzLmF2ZXJhZ2VPeHlnZW5TYXR1cmF0aW9uID0gTWF0aC5yb3VuZChyb3cuYXZnX3ZhbHVlKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHM7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB2aXRhbHMgc3RhdGlzdGljczonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgcmVhZGluZ3NDb3VudDogMCwgdHJlbmQ6ICd1bmtub3duJyB9O1xuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgaGlnaGxpZ2h0cyBhbmQgY29uY2VybnNcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVJbnNpZ2h0cyhzdW1tYXJ5OiBXZWVrbHlTdW1tYXJ5KTogeyBoaWdobGlnaHRzOiBzdHJpbmdbXTsgY29uY2VybnM6IHN0cmluZ1tdIH0ge1xuICBjb25zdCBoaWdobGlnaHRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjb25jZXJuczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBNZWRpY2F0aW9uIGFkaGVyZW5jZVxuICBpZiAoc3VtbWFyeS5tZWRpY2F0aW9ucy5hZGhlcmVuY2VTY29yZSA+PSA5MCkge1xuICAgIGhpZ2hsaWdodHMucHVzaChgRXhjZWxsZW50IG1lZGljYXRpb24gYWRoZXJlbmNlIGF0ICR7c3VtbWFyeS5tZWRpY2F0aW9ucy5hZGhlcmVuY2VTY29yZX0lYCk7XG4gIH0gZWxzZSBpZiAoc3VtbWFyeS5tZWRpY2F0aW9ucy5hZGhlcmVuY2VTY29yZSA8IDgwKSB7XG4gICAgY29uY2VybnMucHVzaChgTG93IG1lZGljYXRpb24gYWRoZXJlbmNlIGF0ICR7c3VtbWFyeS5tZWRpY2F0aW9ucy5hZGhlcmVuY2VTY29yZX0lIC0gJHtzdW1tYXJ5Lm1lZGljYXRpb25zLnRvdGFsTWlzc2VkfSBkb3NlcyBtaXNzZWRgKTtcbiAgfVxuXG4gIC8vIFZpdGFsIHNpZ25zXG4gIGlmIChzdW1tYXJ5LnZpdGFscy5yZWFkaW5nc0NvdW50ID4gMTQpIHtcbiAgICBoaWdobGlnaHRzLnB1c2goYENvbnNpc3RlbnQgaGVhbHRoIG1vbml0b3Jpbmcgd2l0aCAke3N1bW1hcnkudml0YWxzLnJlYWRpbmdzQ291bnR9IHZpdGFsIHNpZ24gcmVhZGluZ3NgKTtcbiAgfSBlbHNlIGlmIChzdW1tYXJ5LnZpdGFscy5yZWFkaW5nc0NvdW50IDwgNykge1xuICAgIGNvbmNlcm5zLnB1c2goYExpbWl0ZWQgaGVhbHRoIG1vbml0b3JpbmcgLSBvbmx5ICR7c3VtbWFyeS52aXRhbHMucmVhZGluZ3NDb3VudH0gcmVhZGluZ3MgdGhpcyB3ZWVrYCk7XG4gIH1cblxuICAvLyBIZWFydCByYXRlXG4gIGlmIChzdW1tYXJ5LnZpdGFscy5hdmVyYWdlSGVhcnRSYXRlKSB7XG4gICAgaWYgKHN1bW1hcnkudml0YWxzLmF2ZXJhZ2VIZWFydFJhdGUgPj0gNjAgJiYgc3VtbWFyeS52aXRhbHMuYXZlcmFnZUhlYXJ0UmF0ZSA8PSAxMDApIHtcbiAgICAgIGhpZ2hsaWdodHMucHVzaChgSGVhcnQgcmF0ZSB3aXRoaW4gbm9ybWFsIHJhbmdlIChhdmc6ICR7c3VtbWFyeS52aXRhbHMuYXZlcmFnZUhlYXJ0UmF0ZX0gYnBtKWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25jZXJucy5wdXNoKGBIZWFydCByYXRlIG91dHNpZGUgbm9ybWFsIHJhbmdlIChhdmc6ICR7c3VtbWFyeS52aXRhbHMuYXZlcmFnZUhlYXJ0UmF0ZX0gYnBtKWApO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJsb29kIHByZXNzdXJlXG4gIGlmIChzdW1tYXJ5LnZpdGFscy5hdmVyYWdlQmxvb2RQcmVzc3VyZSkge1xuICAgIGNvbnN0IHsgc3lzdG9saWMsIGRpYXN0b2xpYyB9ID0gc3VtbWFyeS52aXRhbHMuYXZlcmFnZUJsb29kUHJlc3N1cmU7XG4gICAgaWYgKHN5c3RvbGljID49IDkwICYmIHN5c3RvbGljIDw9IDEyMCAmJiBkaWFzdG9saWMgPj0gNjAgJiYgZGlhc3RvbGljIDw9IDgwKSB7XG4gICAgICBoaWdobGlnaHRzLnB1c2goYEJsb29kIHByZXNzdXJlIHdpdGhpbiBub3JtYWwgcmFuZ2UgKGF2ZzogJHtzeXN0b2xpY30vJHtkaWFzdG9saWN9KWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25jZXJucy5wdXNoKGBCbG9vZCBwcmVzc3VyZSBvdXRzaWRlIG5vcm1hbCByYW5nZSAoYXZnOiAke3N5c3RvbGljfS8ke2RpYXN0b2xpY30pYCk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3h5Z2VuIHNhdHVyYXRpb25cbiAgaWYgKHN1bW1hcnkudml0YWxzLmF2ZXJhZ2VPeHlnZW5TYXR1cmF0aW9uKSB7XG4gICAgaWYgKHN1bW1hcnkudml0YWxzLmF2ZXJhZ2VPeHlnZW5TYXR1cmF0aW9uID49IDk1KSB7XG4gICAgICBoaWdobGlnaHRzLnB1c2goYE94eWdlbiBzYXR1cmF0aW9uIGhlYWx0aHkgKGF2ZzogJHtzdW1tYXJ5LnZpdGFscy5hdmVyYWdlT3h5Z2VuU2F0dXJhdGlvbn0lKWApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25jZXJucy5wdXNoKGBMb3cgb3h5Z2VuIHNhdHVyYXRpb24gKGF2ZzogJHtzdW1tYXJ5LnZpdGFscy5hdmVyYWdlT3h5Z2VuU2F0dXJhdGlvbn0lKWApO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFwcG9pbnRtZW50c1xuICBpZiAoc3VtbWFyeS5hcHBvaW50bWVudHMubWlzc2VkID4gMCkge1xuICAgIGNvbmNlcm5zLnB1c2goYCR7c3VtbWFyeS5hcHBvaW50bWVudHMubWlzc2VkfSBtaXNzZWQgYXBwb2ludG1lbnQke3N1bW1hcnkuYXBwb2ludG1lbnRzLm1pc3NlZCA+IDEgPyAncycgOiAnJ31gKTtcbiAgfVxuXG4gIC8vIEFsZXJ0c1xuICBpZiAoc3VtbWFyeS5hbGVydHMuY3JpdGljYWwgPiAwKSB7XG4gICAgY29uY2VybnMucHVzaChgJHtzdW1tYXJ5LmFsZXJ0cy5jcml0aWNhbH0gY3JpdGljYWwgYWxlcnQke3N1bW1hcnkuYWxlcnRzLmNyaXRpY2FsID4gMSA/ICdzJyA6ICcnfSB0aGlzIHdlZWtgKTtcbiAgfVxuXG4gIHJldHVybiB7IGhpZ2hsaWdodHMsIGNvbmNlcm5zIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCBlbWFpbCBmb3Igd2Vla2x5IHN1bW1hcnlcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVFbWFpbEhUTUwoc3VtbWFyeTogV2Vla2x5U3VtbWFyeSk6IHN0cmluZyB7XG4gIGNvbnN0IGhpZ2hsaWdodHNIVE1MID0gc3VtbWFyeS5oaWdobGlnaHRzLmxlbmd0aCA+IDBcbiAgICA/IGA8dWw+JHtzdW1tYXJ5LmhpZ2hsaWdodHMubWFwKGggPT4gYDxsaSBzdHlsZT1cImNvbG9yOiAjMmU3ZDMyO1wiPiR7aH08L2xpPmApLmpvaW4oJycpfTwvdWw+YFxuICAgIDogJzxwIHN0eWxlPVwiY29sb3I6ICM2NjY7XCI+Tm8gaGlnaGxpZ2h0cyB0aGlzIHdlZWs8L3A+JztcblxuICBjb25zdCBjb25jZXJuc0hUTUwgPSBzdW1tYXJ5LmNvbmNlcm5zLmxlbmd0aCA+IDBcbiAgICA/IGA8dWw+JHtzdW1tYXJ5LmNvbmNlcm5zLm1hcChjID0+IGA8bGkgc3R5bGU9XCJjb2xvcjogI2QzMmYyZjtcIj4ke2N9PC9saT5gKS5qb2luKCcnKX08L3VsPmBcbiAgICA6ICc8cCBzdHlsZT1cImNvbG9yOiAjNjY2O1wiPk5vIGNvbmNlcm5zIHRoaXMgd2VlazwvcD4nO1xuXG4gIHJldHVybiBgXG4gICAgPGh0bWw+XG4gICAgICA8Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgcGFkZGluZzogMjBweDsgbWF4LXdpZHRoOiA4MDBweDsgbWFyZ2luOiAwIGF1dG87XCI+XG4gICAgICAgIDxoMSBzdHlsZT1cImNvbG9yOiAjMTk3NmQyO1wiPldlZWtseSBIZWFsdGggU3VtbWFyeTwvaDE+XG4gICAgICAgIDxoMiBzdHlsZT1cImNvbG9yOiAjMzMzO1wiPiR7c3VtbWFyeS5wcmltYXJ5VXNlci5uYW1lfTwvaDI+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6ICM2NjY7XCI+XG4gICAgICAgICAgUGVyaW9kOiAke25ldyBEYXRlKHN1bW1hcnkucGVyaW9kLnN0YXJ0KS50b0xvY2FsZURhdGVTdHJpbmcoKX0gLSAke25ldyBEYXRlKHN1bW1hcnkucGVyaW9kLmVuZCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9XG4gICAgICAgIDwvcD5cblxuICAgICAgICA8ZGl2IHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2UzZjJmZDsgcGFkZGluZzogMjBweDsgYm9yZGVyLXJhZGl1czogOHB4OyBtYXJnaW46IDIwcHggMDtcIj5cbiAgICAgICAgICA8aDMgc3R5bGU9XCJtYXJnaW4tdG9wOiAwO1wiPvCfk4ogVml0YWwgU2lnbnM8L2gzPlxuICAgICAgICAgIDxwPjxzdHJvbmc+VG90YWwgUmVhZGluZ3M6PC9zdHJvbmc+ICR7c3VtbWFyeS52aXRhbHMucmVhZGluZ3NDb3VudH08L3A+XG4gICAgICAgICAgJHtzdW1tYXJ5LnZpdGFscy5hdmVyYWdlSGVhcnRSYXRlID8gYDxwPjxzdHJvbmc+QXZlcmFnZSBIZWFydCBSYXRlOjwvc3Ryb25nPiAke3N1bW1hcnkudml0YWxzLmF2ZXJhZ2VIZWFydFJhdGV9IGJwbTwvcD5gIDogJyd9XG4gICAgICAgICAgJHtzdW1tYXJ5LnZpdGFscy5hdmVyYWdlQmxvb2RQcmVzc3VyZSA/IGA8cD48c3Ryb25nPkF2ZXJhZ2UgQmxvb2QgUHJlc3N1cmU6PC9zdHJvbmc+ICR7c3VtbWFyeS52aXRhbHMuYXZlcmFnZUJsb29kUHJlc3N1cmUuc3lzdG9saWN9LyR7c3VtbWFyeS52aXRhbHMuYXZlcmFnZUJsb29kUHJlc3N1cmUuZGlhc3RvbGljfSBtbUhnPC9wPmAgOiAnJ31cbiAgICAgICAgICAke3N1bW1hcnkudml0YWxzLmF2ZXJhZ2VPeHlnZW5TYXR1cmF0aW9uID8gYDxwPjxzdHJvbmc+QXZlcmFnZSBPeHlnZW4gU2F0dXJhdGlvbjo8L3N0cm9uZz4gJHtzdW1tYXJ5LnZpdGFscy5hdmVyYWdlT3h5Z2VuU2F0dXJhdGlvbn0lPC9wPmAgOiAnJ31cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmM2U1ZjU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiAyMHB4IDA7XCI+XG4gICAgICAgICAgPGgzIHN0eWxlPVwibWFyZ2luLXRvcDogMDtcIj7wn5KKIE1lZGljYXRpb25zPC9oMz5cbiAgICAgICAgICA8cD48c3Ryb25nPkFkaGVyZW5jZSBTY29yZTo8L3N0cm9uZz4gJHtzdW1tYXJ5Lm1lZGljYXRpb25zLmFkaGVyZW5jZVNjb3JlfSU8L3A+XG4gICAgICAgICAgPHA+PHN0cm9uZz5TY2hlZHVsZWQ6PC9zdHJvbmc+ICR7c3VtbWFyeS5tZWRpY2F0aW9ucy50b3RhbFNjaGVkdWxlZH0gfCA8c3Ryb25nPlRha2VuOjwvc3Ryb25nPiAke3N1bW1hcnkubWVkaWNhdGlvbnMudG90YWxUYWtlbn0gfCA8c3Ryb25nPk1pc3NlZDo8L3N0cm9uZz4gJHtzdW1tYXJ5Lm1lZGljYXRpb25zLnRvdGFsTWlzc2VkfTwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmZmYzZTA7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiAyMHB4IDA7XCI+XG4gICAgICAgICAgPGgzIHN0eWxlPVwibWFyZ2luLXRvcDogMDtcIj7wn5OFIEFwcG9pbnRtZW50czwvaDM+XG4gICAgICAgICAgPHA+PHN0cm9uZz5Db21wbGV0ZWQ6PC9zdHJvbmc+ICR7c3VtbWFyeS5hcHBvaW50bWVudHMuY29tcGxldGVkfSB8IDxzdHJvbmc+VXBjb21pbmc6PC9zdHJvbmc+ICR7c3VtbWFyeS5hcHBvaW50bWVudHMudXBjb21pbmd9IHwgPHN0cm9uZz5NaXNzZWQ6PC9zdHJvbmc+ICR7c3VtbWFyeS5hcHBvaW50bWVudHMubWlzc2VkfTwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmZmViZWU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiAyMHB4IDA7XCI+XG4gICAgICAgICAgPGgzIHN0eWxlPVwibWFyZ2luLXRvcDogMDtcIj7wn5qoIEFsZXJ0czwvaDM+XG4gICAgICAgICAgPHA+PHN0cm9uZz5Ub3RhbCBBbGVydHM6PC9zdHJvbmc+ICR7c3VtbWFyeS5hbGVydHMudG90YWx9IHwgPHN0cm9uZz5Dcml0aWNhbDo8L3N0cm9uZz4gJHtzdW1tYXJ5LmFsZXJ0cy5jcml0aWNhbH08L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW46IDMwcHggMDtcIj5cbiAgICAgICAgICA8aDMgc3R5bGU9XCJjb2xvcjogIzJlN2QzMjtcIj7inIUgSGlnaGxpZ2h0czwvaDM+XG4gICAgICAgICAgJHtoaWdobGlnaHRzSFRNTH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBzdHlsZT1cIm1hcmdpbjogMzBweCAwO1wiPlxuICAgICAgICAgIDxoMyBzdHlsZT1cImNvbG9yOiAjZDMyZjJmO1wiPuKaoO+4jyBDb25jZXJuczwvaDM+XG4gICAgICAgICAgJHtjb25jZXJuc0hUTUx9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxociBzdHlsZT1cIm1hcmdpbjogMzBweCAwOyBib3JkZXI6IG5vbmU7IGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkO1wiPlxuICAgICAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTJweDsgY29sb3I6ICM5OTk7XCI+XG4gICAgICAgICAgVGhpcyBpcyBhbiBhdXRvbWF0ZWQgd2Vla2x5IGhlYWx0aCBzdW1tYXJ5IGZyb20gSGVhbHRoY2FyZSBNb25pdG9yaW5nIEFwcC5cbiAgICAgICAgPC9wPlxuICAgICAgPC9ib2R5PlxuICAgIDwvaHRtbD5cbiAgYDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhbmQgc2VuZCB3ZWVrbHkgc3VtbWFyeSBmb3IgYSBwcmltYXJ5IHVzZXJcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTdW1tYXJ5Rm9yVXNlcihwcmltYXJ5VXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgR2VuZXJhdGluZyB3ZWVrbHkgc3VtbWFyeSBmb3IgdXNlcjogJHtwcmltYXJ5VXNlcklkfWApO1xuXG4gICAgLy8gR2V0IHByaW1hcnkgdXNlclxuICAgIGNvbnN0IHByaW1hcnlVc2VyID0gYXdhaXQgZ2V0VXNlcihwcmltYXJ5VXNlcklkKTtcbiAgICBpZiAoIXByaW1hcnlVc2VyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBVc2VyIG5vdCBmb3VuZDogJHtwcmltYXJ5VXNlcklkfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENhbGN1bGF0ZSBkYXRlIHJhbmdlIChsYXN0IDcgZGF5cylcbiAgICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShlbmREYXRlLmdldFRpbWUoKSAtIDcgKiAyNCAqIDYwICogNjAgKiAxMDAwKTtcblxuICAgIC8vIEdldCB2aXRhbHMgc3RhdGlzdGljc1xuICAgIGNvbnN0IHZpdGFscyA9IGF3YWl0IGdldFZpdGFsc1N0YXRpc3RpY3MocHJpbWFyeVVzZXJJZCwgc3RhcnREYXRlLCBlbmREYXRlKTtcblxuICAgIC8vIEdldCBtZWRpY2F0aW9ucyBkYXRhXG4gICAgY29uc3QgbWVkaWNhdGlvbnMgPSBhd2FpdCBnZXRNZWRpY2F0aW9uc0J5VXNlcihwcmltYXJ5VXNlcklkKTtcbiAgICBjb25zdCB3ZWVrTWVkaWNhdGlvbnMgPSBtZWRpY2F0aW9ucy5maWx0ZXIoXG4gICAgICBtZWQgPT4gbWVkLnNjaGVkdWxlZFRpbWUgPj0gc3RhcnREYXRlICYmIG1lZC5zY2hlZHVsZWRUaW1lIDw9IGVuZERhdGVcbiAgICApO1xuICAgIGNvbnN0IHRha2VuQ291bnQgPSB3ZWVrTWVkaWNhdGlvbnMuZmlsdGVyKG1lZCA9PiBtZWQuc3RhdHVzID09PSAndGFrZW4nKS5sZW5ndGg7XG4gICAgY29uc3QgbWlzc2VkQ291bnQgPSB3ZWVrTWVkaWNhdGlvbnMuZmlsdGVyKG1lZCA9PiBtZWQuc3RhdHVzID09PSAnbWlzc2VkJykubGVuZ3RoO1xuICAgIGNvbnN0IGFkaGVyZW5jZVNjb3JlID0gd2Vla01lZGljYXRpb25zLmxlbmd0aCA+IDAgXG4gICAgICA/IE1hdGgucm91bmQoKHRha2VuQ291bnQgLyB3ZWVrTWVkaWNhdGlvbnMubGVuZ3RoKSAqIDEwMCkgXG4gICAgICA6IDEwMDtcblxuICAgIC8vIEdldCBhcHBvaW50bWVudHMgZGF0YVxuICAgIGNvbnN0IGFwcG9pbnRtZW50cyA9IGF3YWl0IGdldEFwcG9pbnRtZW50c0J5VXNlcihwcmltYXJ5VXNlcklkKTtcbiAgICBjb25zdCB3ZWVrQXBwb2ludG1lbnRzID0gYXBwb2ludG1lbnRzLmZpbHRlcihcbiAgICAgIGFwdCA9PiBhcHQuc2NoZWR1bGVkVGltZSA+PSBzdGFydERhdGUgJiYgYXB0LnNjaGVkdWxlZFRpbWUgPD0gZW5kRGF0ZVxuICAgICk7XG4gICAgY29uc3QgY29tcGxldGVkQXBwb2ludG1lbnRzID0gd2Vla0FwcG9pbnRtZW50cy5maWx0ZXIoYXB0ID0+IGFwdC5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKS5sZW5ndGg7XG4gICAgY29uc3QgbWlzc2VkQXBwb2ludG1lbnRzID0gd2Vla0FwcG9pbnRtZW50cy5maWx0ZXIoYXB0ID0+IGFwdC5zdGF0dXMgPT09ICdtaXNzZWQnKS5sZW5ndGg7XG4gICAgY29uc3QgdXBjb21pbmdBcHBvaW50bWVudHMgPSBhcHBvaW50bWVudHMuZmlsdGVyKFxuICAgICAgYXB0ID0+IGFwdC5zdGF0dXMgPT09ICdzY2hlZHVsZWQnICYmIGFwdC5zY2hlZHVsZWRUaW1lID4gZW5kRGF0ZVxuICAgICkubGVuZ3RoO1xuXG4gICAgLy8gR2V0IGFsZXJ0cyBkYXRhXG4gICAgY29uc3QgYWxlcnRzID0gYXdhaXQgZ2V0QWxlcnRzQnlVc2VyKHByaW1hcnlVc2VySWQpO1xuICAgIGNvbnN0IHdlZWtBbGVydHMgPSBhbGVydHMuZmlsdGVyKFxuICAgICAgYWxlcnQgPT4gYWxlcnQudGltZXN0YW1wID49IHN0YXJ0RGF0ZSAmJiBhbGVydC50aW1lc3RhbXAgPD0gZW5kRGF0ZVxuICAgICk7XG4gICAgY29uc3QgY3JpdGljYWxBbGVydHMgPSB3ZWVrQWxlcnRzLmZpbHRlcihhbGVydCA9PiBhbGVydC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykubGVuZ3RoO1xuICAgIGNvbnN0IGFsZXJ0c0J5VHlwZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgIHdlZWtBbGVydHMuZm9yRWFjaChhbGVydCA9PiB7XG4gICAgICBhbGVydHNCeVR5cGVbYWxlcnQudHlwZV0gPSAoYWxlcnRzQnlUeXBlW2FsZXJ0LnR5cGVdIHx8IDApICsgMTtcbiAgICB9KTtcblxuICAgIC8vIEJ1aWxkIHN1bW1hcnlcbiAgICBjb25zdCBzdW1tYXJ5OiBXZWVrbHlTdW1tYXJ5ID0ge1xuICAgICAgcHJpbWFyeVVzZXI6IHtcbiAgICAgICAgbmFtZTogYCR7cHJpbWFyeVVzZXIucHJvZmlsZS5maXJzdE5hbWV9ICR7cHJpbWFyeVVzZXIucHJvZmlsZS5sYXN0TmFtZX1gLFxuICAgICAgICBpZDogcHJpbWFyeVVzZXJJZCxcbiAgICAgIH0sXG4gICAgICBwZXJpb2Q6IHtcbiAgICAgICAgc3RhcnQ6IHN0YXJ0RGF0ZS50b0lTT1N0cmluZygpLFxuICAgICAgICBlbmQ6IGVuZERhdGUudG9JU09TdHJpbmcoKSxcbiAgICAgIH0sXG4gICAgICB2aXRhbHMsXG4gICAgICBtZWRpY2F0aW9uczoge1xuICAgICAgICBhZGhlcmVuY2VTY29yZSxcbiAgICAgICAgdG90YWxTY2hlZHVsZWQ6IHdlZWtNZWRpY2F0aW9ucy5sZW5ndGgsXG4gICAgICAgIHRvdGFsVGFrZW46IHRha2VuQ291bnQsXG4gICAgICAgIHRvdGFsTWlzc2VkOiBtaXNzZWRDb3VudCxcbiAgICAgIH0sXG4gICAgICBhcHBvaW50bWVudHM6IHtcbiAgICAgICAgY29tcGxldGVkOiBjb21wbGV0ZWRBcHBvaW50bWVudHMsXG4gICAgICAgIHVwY29taW5nOiB1cGNvbWluZ0FwcG9pbnRtZW50cyxcbiAgICAgICAgbWlzc2VkOiBtaXNzZWRBcHBvaW50bWVudHMsXG4gICAgICB9LFxuICAgICAgYWxlcnRzOiB7XG4gICAgICAgIHRvdGFsOiB3ZWVrQWxlcnRzLmxlbmd0aCxcbiAgICAgICAgY3JpdGljYWw6IGNyaXRpY2FsQWxlcnRzLFxuICAgICAgICBieVR5cGU6IGFsZXJ0c0J5VHlwZSxcbiAgICAgIH0sXG4gICAgICBoaWdobGlnaHRzOiBbXSxcbiAgICAgIGNvbmNlcm5zOiBbXSxcbiAgICB9O1xuXG4gICAgLy8gR2VuZXJhdGUgaW5zaWdodHNcbiAgICBjb25zdCBpbnNpZ2h0cyA9IGdlbmVyYXRlSW5zaWdodHMoc3VtbWFyeSk7XG4gICAgc3VtbWFyeS5oaWdobGlnaHRzID0gaW5zaWdodHMuaGlnaGxpZ2h0cztcbiAgICBzdW1tYXJ5LmNvbmNlcm5zID0gaW5zaWdodHMuY29uY2VybnM7XG5cbiAgICAvLyBHZXQgY2FyZSBjaXJjbGUgbWVtYmVyc1xuICAgIGNvbnN0IGNhcmVDaXJjbGVNZW1iZXJzID0gYXdhaXQgZ2V0Q2FyZUNpcmNsZU1lbWJlcnMocHJpbWFyeVVzZXJJZCk7XG5cbiAgICAvLyBTZW5kIGVtYWlsIHRvIGVhY2ggY2FyZSBjaXJjbGUgbWVtYmVyXG4gICAgZm9yIChjb25zdCBtZW1iZXIgb2YgY2FyZUNpcmNsZU1lbWJlcnMpIHtcbiAgICAgIGNvbnN0IHNlY29uZGFyeVVzZXIgPSBhd2FpdCBnZXRVc2VyKG1lbWJlci5zZWNvbmRhcnlVc2VySWQpO1xuICAgICAgaWYgKCFzZWNvbmRhcnlVc2VyKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgZW1haWxIVE1MID0gZ2VuZXJhdGVFbWFpbEhUTUwoc3VtbWFyeSk7XG5cbiAgICAgIGF3YWl0IHNlc0NsaWVudC5zZW5kKG5ldyBTZW5kRW1haWxDb21tYW5kKHtcbiAgICAgICAgU291cmNlOiBwcm9jZXNzLmVudi5TRVNfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBoZWFsdGhjYXJlLW1vbml0b3JpbmcuY29tJyxcbiAgICAgICAgRGVzdGluYXRpb246IHtcbiAgICAgICAgICBUb0FkZHJlc3NlczogW3NlY29uZGFyeVVzZXIucHJvZmlsZS5lbWFpbF0sXG4gICAgICAgIH0sXG4gICAgICAgIE1lc3NhZ2U6IHtcbiAgICAgICAgICBTdWJqZWN0OiB7XG4gICAgICAgICAgICBEYXRhOiBgV2Vla2x5IEhlYWx0aCBTdW1tYXJ5OiAke3N1bW1hcnkucHJpbWFyeVVzZXIubmFtZX1gLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgQm9keToge1xuICAgICAgICAgICAgSHRtbDoge1xuICAgICAgICAgICAgICBEYXRhOiBlbWFpbEhUTUwsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKGBTZW50IHdlZWtseSBzdW1tYXJ5IHRvOiAke3NlY29uZGFyeVVzZXIucHJvZmlsZS5lbWFpbH1gKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGdlbmVyYXRlZCBhbmQgc2VudCB3ZWVrbHkgc3VtbWFyeSBmb3IgdXNlcjogJHtwcmltYXJ5VXNlcklkfWApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdlbmVyYXRpbmcgc3VtbWFyeSBmb3IgdXNlciAke3ByaW1hcnlVc2VySWR9OmAsIGVycm9yKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogU2NoZWR1bGVkRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIHdlZWtseSBoZWFsdGggc3VtbWFyeSBnZW5lcmF0aW9uJyk7XG5cbiAgdHJ5IHtcbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHdlIHdvdWxkIHF1ZXJ5IGFsbCBwcmltYXJ5IHVzZXJzXG4gICAgLy8gRm9yIG5vdywgdGhpcyB3b3VsZCBiZSB0cmlnZ2VyZWQgYnkgRXZlbnRCcmlkZ2UgZm9yIGVhY2ggdXNlclxuICAgIGNvbnN0IHByaW1hcnlVc2VySWQgPSBwcm9jZXNzLmVudi5QUklNQVJZX1VTRVJfSUQ7XG4gICAgXG4gICAgaWYgKHByaW1hcnlVc2VySWQpIHtcbiAgICAgIGF3YWl0IGdlbmVyYXRlU3VtbWFyeUZvclVzZXIocHJpbWFyeVVzZXJJZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCdObyBQUklNQVJZX1VTRVJfSUQgc3BlY2lmaWVkIGluIGVudmlyb25tZW50Jyk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ1dlZWtseSBoZWFsdGggc3VtbWFyeSBnZW5lcmF0aW9uIGNvbXBsZXRlZCcpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHdlZWtseSBoZWFsdGggc3VtbWFyeSBnZW5lcmF0aW9uOicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIl19