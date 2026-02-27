"use strict";
// Get Care Circle Dashboard Lambda Function
// Requirements: 4.1, 4.5
// Provides comprehensive health status dashboard for care circle members
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
const medications_1 = require("../shared/data-access/medications");
const appointments_1 = require("../shared/data-access/appointments");
const alerts_1 = require("../shared/data-access/alerts");
const timestream_client_1 = require("../shared/timestream-client");
/**
 * Get latest vital signs from Timestream
 */
async function getLatestVitals(userId) {
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
        const results = await (0, timestream_client_1.queryTimestream)(query);
        if (results.length === 0) {
            return undefined;
        }
        // Group by latest timestamp
        const vitals = {
            timestamp: new Date(results[0].time),
            source: 'device',
        };
        for (const row of results) {
            switch (row.measure_name) {
                case 'heartRate':
                    vitals.heartRate = row.value;
                    break;
                case 'bloodPressureSystolic':
                    if (!vitals.bloodPressure)
                        vitals.bloodPressure = { systolic: 0, diastolic: 0 };
                    vitals.bloodPressure.systolic = row.value;
                    break;
                case 'bloodPressureDiastolic':
                    if (!vitals.bloodPressure)
                        vitals.bloodPressure = { systolic: 0, diastolic: 0 };
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
        return vitals;
    }
    catch (error) {
        console.error('Error getting latest vitals:', error);
        return undefined;
    }
}
/**
 * Calculate vitals trend
 */
async function calculateVitalsTrend(userId) {
    try {
        const query = `
      SELECT measure_name, measure_value::double as value, time
      FROM "${process.env.TIMESTREAM_DATABASE}"."${process.env.TIMESTREAM_TABLE}"
      WHERE userId = '${userId}'
        AND time > ago(7d)
        AND measure_name IN ('heartRate', 'bloodPressureSystolic', 'oxygenSaturation')
      ORDER BY time DESC
    `;
        const results = await (0, timestream_client_1.queryTimestream)(query);
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
        if (concerningCount > 5)
            return 'concerning';
        if (concerningCount > 2)
            return 'declining';
        return 'stable';
    }
    catch (error) {
        console.error('Error calculating vitals trend:', error);
        return 'unknown';
    }
}
async function handler(event) {
    try {
        // Get userId from path parameters
        const primaryUserId = event.pathParameters?.userId;
        if (!primaryUserId) {
            return (0, types_1.createErrorResponse)(400, 'userId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Check if requesting user has permission to view dashboard
        if (requestingUserId !== primaryUserId) {
            const hasPermission = await (0, care_circle_1.checkPermission)(primaryUserId, requestingUserId, 'canViewVitals');
            if (!hasPermission) {
                return (0, types_1.createErrorResponse)(403, 'You do not have permission to view this dashboard');
            }
        }
        // Get primary user information
        const primaryUser = await (0, users_1.getUser)(primaryUserId);
        if (!primaryUser) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        // Get latest vitals and trend
        const latestVitals = await getLatestVitals(primaryUserId);
        const vitalsTrend = await calculateVitalsTrend(primaryUserId);
        // Get medications data
        const medications = await (0, medications_1.getMedicationsByUser)(primaryUserId);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const upcomingMedications = medications.filter(med => med.status === 'scheduled' && med.scheduledTime >= now && med.scheduledTime <= tomorrow);
        const missedToday = medications.filter(med => med.status === 'missed' && med.scheduledTime >= todayStart && med.scheduledTime <= now);
        // Calculate adherence score (last 7 days)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentMeds = medications.filter(med => med.scheduledTime >= weekAgo);
        const takenCount = recentMeds.filter(med => med.status === 'taken').length;
        const adherenceScore = recentMeds.length > 0 ? Math.round((takenCount / recentMeds.length) * 100) : 100;
        // Get appointments data
        const appointments = await (0, appointments_1.getAppointmentsByUser)(primaryUserId);
        const upcomingAppointments = appointments
            .filter(apt => apt.status === 'scheduled' && apt.scheduledTime >= now)
            .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
        const nextAppointment = upcomingAppointments[0];
        // Get alerts data
        const alerts = await (0, alerts_1.getAlertsByUser)(primaryUserId);
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
        const dashboard = {
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
        return (0, types_1.createSuccessResponse)({
            dashboard,
            generatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error getting care circle dashboard:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to retrieve dashboard data');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWNhcmUtY2lyY2xlLWRhc2hib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1jYXJlLWNpcmNsZS1kYXNoYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1Qyx5QkFBeUI7QUFDekIseUVBQXlFOztBQXNKekUsMEJBbUhDO0FBdFFELDJDQUF5RjtBQUN6RixtRUFBb0U7QUFDcEUsdURBQXNEO0FBQ3RELG1FQUF5RTtBQUN6RSxxRUFBMkU7QUFDM0UseURBQStEO0FBQy9ELG1FQUE4RDtBQXVDOUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsZUFBZSxDQUFDLE1BQWM7SUFDM0MsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUc7O2NBRUosT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQjt3QkFDdkQsTUFBTTs7Ozs7S0FLekIsQ0FBQztRQUVGLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBQSxtQ0FBZSxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sTUFBTSxHQUF3QjtZQUNsQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNwQyxNQUFNLEVBQUUsUUFBUTtTQUNqQixDQUFDO1FBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMxQixRQUFRLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxXQUFXO29CQUNkLE1BQU0sQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztvQkFDN0IsTUFBTTtnQkFDUixLQUFLLHVCQUF1QjtvQkFDMUIsSUFBSSxDQUFD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b0JBQ3ZDLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSTtvQkFDMUIsYUFBYSxFQUFFLGVBQWUsQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFO2lCQUMzRCxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUNiLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNO2FBQzNDO1lBQ0QsTUFBTSxFQUFFO2dCQUNOLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLE1BQU07Z0JBQ2hELGFBQWEsRUFBRSxjQUFjLENBQUMsTUFBTTtnQkFDcEMsWUFBWTthQUNiO1NBQ0YsQ0FBQztRQUVGLE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixTQUFTO1lBQ1QsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1NBQ3RDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLG1DQUFtQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBHZXQgQ2FyZSBDaXJjbGUgRGFzaGJvYXJkIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjEsIDQuNVxuLy8gUHJvdmlkZXMgY29tcHJlaGVuc2l2ZSBoZWFsdGggc3RhdHVzIGRhc2hib2FyZCBmb3IgY2FyZSBjaXJjbGUgbWVtYmVyc1xuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UsIFZpdGFsU2lnbnMgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgY2hlY2tQZXJtaXNzaW9uIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGdldFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnO1xuaW1wb3J0IHsgZ2V0TWVkaWNhdGlvbnNCeVVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0IHsgZ2V0QXBwb2ludG1lbnRzQnlVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FwcG9pbnRtZW50cyc7XG5pbXBvcnQgeyBnZXRBbGVydHNCeVVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvYWxlcnRzJztcbmltcG9ydCB7IHF1ZXJ5VGltZXN0cmVhbSB9IGZyb20gJy4uL3NoYXJlZC90aW1lc3RyZWFtLWNsaWVudCc7XG5cbmludGVyZmFjZSBEYXNoYm9hcmREYXRhIHtcbiAgcHJpbWFyeVVzZXI6IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBsYXN0QWN0aXZlOiBzdHJpbmc7XG4gIH07XG4gIGhlYWx0aFN0YXR1czoge1xuICAgIGxhdGVzdFZpdGFscz86IFZpdGFsU2lnbnM7XG4gICAgdml0YWxzVHJlbmQ6ICdpbXByb3ZpbmcnIHwgJ3N0YWJsZScgfCAnZGVjbGluaW5nJyB8ICdjb25jZXJuaW5nJyB8ICd1bmtub3duJztcbiAgICBsYXN0UmVjb3JkZWQ/OiBzdHJpbmc7XG4gIH07XG4gIG1lZGljYXRpb25zOiB7XG4gICAgdXBjb21pbmdDb3VudDogbnVtYmVyO1xuICAgIGFkaGVyZW5jZVNjb3JlOiBudW1iZXI7XG4gICAgbWlzc2VkVG9kYXk6IG51bWJlcjtcbiAgfTtcbiAgYXBwb2ludG1lbnRzOiB7XG4gICAgbmV4dEFwcG9pbnRtZW50Pzoge1xuICAgICAgcHJvdmlkZXI6IHN0cmluZztcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICAgIHNjaGVkdWxlZFRpbWU6IHN0cmluZztcbiAgICB9O1xuICAgIHVwY29taW5nQ291bnQ6IG51bWJlcjtcbiAgfTtcbiAgYWxlcnRzOiB7XG4gICAgdW5hY2tub3dsZWRnZWRDb3VudDogbnVtYmVyO1xuICAgIGNyaXRpY2FsQ291bnQ6IG51bWJlcjtcbiAgICByZWNlbnRBbGVydHM6IEFycmF5PHtcbiAgICAgIGlkOiBzdHJpbmc7XG4gICAgICB0eXBlOiBzdHJpbmc7XG4gICAgICBzZXZlcml0eTogc3RyaW5nO1xuICAgICAgbWVzc2FnZTogc3RyaW5nO1xuICAgICAgdGltZXN0YW1wOiBzdHJpbmc7XG4gICAgfT47XG4gIH07XG59XG5cbi8qKlxuICogR2V0IGxhdGVzdCB2aXRhbCBzaWducyBmcm9tIFRpbWVzdHJlYW1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0TGF0ZXN0Vml0YWxzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxWaXRhbFNpZ25zIHwgdW5kZWZpbmVkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcXVlcnkgPSBgXG4gICAgICBTRUxFQ1QgbWVhc3VyZV9uYW1lLCBtZWFzdXJlX3ZhbHVlOjpkb3VibGUgYXMgdmFsdWUsIHRpbWVcbiAgICAgIEZST00gXCIke3Byb2Nlc3MuZW52LlRJTUVTVFJFQU1fREFUQUJBU0V9XCIuXCIke3Byb2Nlc3MuZW52LlRJTUVTVFJFQU1fVEFCTEV9XCJcbiAgICAgIFdIRVJFIHVzZXJJZCA9ICcke3VzZXJJZH0nXG4gICAgICAgIEFORCBtZWFzdXJlX25hbWUgSU4gKCdoZWFydFJhdGUnLCAnYmxvb2RQcmVzc3VyZVN5c3RvbGljJywgJ2Jsb29kUHJlc3N1cmVEaWFzdG9saWMnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RlbXBlcmF0dXJlJywgJ294eWdlblNhdHVyYXRpb24nLCAnd2VpZ2h0JylcbiAgICAgIE9SREVSIEJZIHRpbWUgREVTQ1xuICAgICAgTElNSVQgMTBcbiAgICBgO1xuXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHF1ZXJ5VGltZXN0cmVhbShxdWVyeSk7XG4gICAgXG4gICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIEdyb3VwIGJ5IGxhdGVzdCB0aW1lc3RhbXBcbiAgICBjb25zdCB2aXRhbHM6IFBhcnRpYWw8Vml0YWxTaWducz4gPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKHJlc3VsdHNbMF0udGltZSksXG4gICAgICBzb3VyY2U6ICdkZXZpY2UnLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IHJvdyBvZiByZXN1bHRzKSB7XG4gICAgICBzd2l0Y2ggKHJvdy5tZWFzdXJlX25hbWUpIHtcbiAgICAgICAgY2FzZSAnaGVhcnRSYXRlJzpcbiAgICAgICAgICB2aXRhbHMuaGVhcnRSYXRlID0gcm93LnZhbHVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdibG9vZFByZXNzdXJlU3lzdG9saWMnOlxuICAgICAgICAgIGlmICghdml0YWxzLmJsb29kUHJlc3N1cmUpIHZpdGFscy5ibG9vZFByZXNzdXJlID0geyBzeXN0b2xpYzogMCwgZGlhc3RvbGljOiAwIH07XG4gICAgICAgICAgdml0YWxzLmJsb29kUHJlc3N1cmUuc3lzdG9saWMgPSByb3cudmFsdWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Jsb29kUHJlc3N1cmVEaWFzdG9saWMnOlxuICAgICAgICAgIGlmICghdml0YWxzLmJsb29kUHJlc3N1cmUpIHZpdGFscy5ibG9vZFByZXNzdXJlID0geyBzeXN0b2xpYzogMCwgZGlhc3RvbGljOiAwIH07XG4gICAgICAgICAgdml0YWxzLmJsb29kUHJlc3N1cmUuZGlhc3RvbGljID0gcm93LnZhbHVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd0ZW1wZXJhdHVyZSc6XG4gICAgICAgICAgdml0YWxzLnRlbXBlcmF0dXJlID0gcm93LnZhbHVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdveHlnZW5TYXR1cmF0aW9uJzpcbiAgICAgICAgICB2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbiA9IHJvdy52YWx1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnd2VpZ2h0JzpcbiAgICAgICAgICB2aXRhbHMud2VpZ2h0ID0gcm93LnZhbHVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2aXRhbHMgYXMgVml0YWxTaWducztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGxhdGVzdCB2aXRhbHM6JywgZXJyb3IpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgdml0YWxzIHRyZW5kXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhbGN1bGF0ZVZpdGFsc1RyZW5kKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTwnaW1wcm92aW5nJyB8ICdzdGFibGUnIHwgJ2RlY2xpbmluZycgfCAnY29uY2VybmluZycgfCAndW5rbm93bic+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBxdWVyeSA9IGBcbiAgICAgIFNFTEVDVCBtZWFzdXJlX25hbWUsIG1lYXN1cmVfdmFsdWU6OmRvdWJsZSBhcyB2YWx1ZSwgdGltZVxuICAgICAgRlJPTSBcIiR7cHJvY2Vzcy5lbnYuVElNRVNUUkVBTV9EQVRBQkFTRX1cIi5cIiR7cHJvY2Vzcy5lbnYuVElNRVNUUkVBTV9UQUJMRX1cIlxuICAgICAgV0hFUkUgdXNlcklkID0gJyR7dXNlcklkfSdcbiAgICAgICAgQU5EIHRpbWUgPiBhZ28oN2QpXG4gICAgICAgIEFORCBtZWFzdXJlX25hbWUgSU4gKCdoZWFydFJhdGUnLCAnYmxvb2RQcmVzc3VyZVN5c3RvbGljJywgJ294eWdlblNhdHVyYXRpb24nKVxuICAgICAgT1JERVIgQlkgdGltZSBERVNDXG4gICAgYDtcblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBxdWVyeVRpbWVzdHJlYW0ocXVlcnkpO1xuICAgIFxuICAgIGlmIChyZXN1bHRzLmxlbmd0aCA8IDUpIHtcbiAgICAgIHJldHVybiAndW5rbm93bic7XG4gICAgfVxuXG4gICAgLy8gU2ltcGxlIHRyZW5kIGFuYWx5c2lzIC0gY2hlY2sgaWYgcmVjZW50IHZhbHVlcyBhcmUgd2l0aGluIG5vcm1hbCByYW5nZXNcbiAgICBsZXQgY29uY2VybmluZ0NvdW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiByZXN1bHRzLnNsaWNlKDAsIDEwKSkge1xuICAgICAgaWYgKHJvdy5tZWFzdXJlX25hbWUgPT09ICdoZWFydFJhdGUnICYmIChyb3cudmFsdWUgPCA2MCB8fCByb3cudmFsdWUgPiAxMDApKSB7XG4gICAgICAgIGNvbmNlcm5pbmdDb3VudCsrO1xuICAgICAgfVxuICAgICAgaWYgKHJvdy5tZWFzdXJlX25hbWUgPT09ICdibG9vZFByZXNzdXJlU3lzdG9saWMnICYmIChyb3cudmFsdWUgPCA5MCB8fCByb3cudmFsdWUgPiAxNDApKSB7XG4gICAgICAgIGNvbmNlcm5pbmdDb3VudCsrO1xuICAgICAgfVxuICAgICAgaWYgKHJvdy5tZWFzdXJlX25hbWUgPT09ICdveHlnZW5TYXR1cmF0aW9uJyAmJiByb3cudmFsdWUgPCA5NSkge1xuICAgICAgICBjb25jZXJuaW5nQ291bnQrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29uY2VybmluZ0NvdW50ID4gNSkgcmV0dXJuICdjb25jZXJuaW5nJztcbiAgICBpZiAoY29uY2VybmluZ0NvdW50ID4gMikgcmV0dXJuICdkZWNsaW5pbmcnO1xuICAgIHJldHVybiAnc3RhYmxlJztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjYWxjdWxhdGluZyB2aXRhbHMgdHJlbmQ6JywgZXJyb3IpO1xuICAgIHJldHVybiAndW5rbm93bic7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgcHJpbWFyeVVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VySWQ7XG4gICAgaWYgKCFwcmltYXJ5VXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICd1c2VySWQgaXMgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiByZXF1ZXN0aW5nIHVzZXIgaGFzIHBlcm1pc3Npb24gdG8gdmlldyBkYXNoYm9hcmRcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJJZCAhPT0gcHJpbWFyeVVzZXJJZCkge1xuICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihwcmltYXJ5VXNlcklkLCByZXF1ZXN0aW5nVXNlcklkLCAnY2FuVmlld1ZpdGFscycpO1xuICAgICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIHZpZXcgdGhpcyBkYXNoYm9hcmQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHZXQgcHJpbWFyeSB1c2VyIGluZm9ybWF0aW9uXG4gICAgY29uc3QgcHJpbWFyeVVzZXIgPSBhd2FpdCBnZXRVc2VyKHByaW1hcnlVc2VySWQpO1xuICAgIGlmICghcHJpbWFyeVVzZXIpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGxhdGVzdCB2aXRhbHMgYW5kIHRyZW5kXG4gICAgY29uc3QgbGF0ZXN0Vml0YWxzID0gYXdhaXQgZ2V0TGF0ZXN0Vml0YWxzKHByaW1hcnlVc2VySWQpO1xuICAgIGNvbnN0IHZpdGFsc1RyZW5kID0gYXdhaXQgY2FsY3VsYXRlVml0YWxzVHJlbmQocHJpbWFyeVVzZXJJZCk7XG5cbiAgICAvLyBHZXQgbWVkaWNhdGlvbnMgZGF0YVxuICAgIGNvbnN0IG1lZGljYXRpb25zID0gYXdhaXQgZ2V0TWVkaWNhdGlvbnNCeVVzZXIocHJpbWFyeVVzZXJJZCk7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCB0b21vcnJvdyA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgKyAyNCAqIDYwICogNjAgKiAxMDAwKTtcbiAgICBjb25zdCB0b2RheVN0YXJ0ID0gbmV3IERhdGUobm93LnNldEhvdXJzKDAsIDAsIDAsIDApKTtcbiAgICBcbiAgICBjb25zdCB1cGNvbWluZ01lZGljYXRpb25zID0gbWVkaWNhdGlvbnMuZmlsdGVyKFxuICAgICAgbWVkID0+IG1lZC5zdGF0dXMgPT09ICdzY2hlZHVsZWQnICYmIG1lZC5zY2hlZHVsZWRUaW1lID49IG5vdyAmJiBtZWQuc2NoZWR1bGVkVGltZSA8PSB0b21vcnJvd1xuICAgICk7XG4gICAgXG4gICAgY29uc3QgbWlzc2VkVG9kYXkgPSBtZWRpY2F0aW9ucy5maWx0ZXIoXG4gICAgICBtZWQgPT4gbWVkLnN0YXR1cyA9PT0gJ21pc3NlZCcgJiYgbWVkLnNjaGVkdWxlZFRpbWUgPj0gdG9kYXlTdGFydCAmJiBtZWQuc2NoZWR1bGVkVGltZSA8PSBub3dcbiAgICApO1xuXG4gICAgLy8gQ2FsY3VsYXRlIGFkaGVyZW5jZSBzY29yZSAobGFzdCA3IGRheXMpXG4gICAgY29uc3Qgd2Vla0FnbyA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSA3ICogMjQgKiA2MCAqIDYwICogMTAwMCk7XG4gICAgY29uc3QgcmVjZW50TWVkcyA9IG1lZGljYXRpb25zLmZpbHRlcihtZWQgPT4gbWVkLnNjaGVkdWxlZFRpbWUgPj0gd2Vla0Fnbyk7XG4gICAgY29uc3QgdGFrZW5Db3VudCA9IHJlY2VudE1lZHMuZmlsdGVyKG1lZCA9PiBtZWQuc3RhdHVzID09PSAndGFrZW4nKS5sZW5ndGg7XG4gICAgY29uc3QgYWRoZXJlbmNlU2NvcmUgPSByZWNlbnRNZWRzLmxlbmd0aCA+IDAgPyBNYXRoLnJvdW5kKCh0YWtlbkNvdW50IC8gcmVjZW50TWVkcy5sZW5ndGgpICogMTAwKSA6IDEwMDtcblxuICAgIC8vIEdldCBhcHBvaW50bWVudHMgZGF0YVxuICAgIGNvbnN0IGFwcG9pbnRtZW50cyA9IGF3YWl0IGdldEFwcG9pbnRtZW50c0J5VXNlcihwcmltYXJ5VXNlcklkKTtcbiAgICBjb25zdCB1cGNvbWluZ0FwcG9pbnRtZW50cyA9IGFwcG9pbnRtZW50c1xuICAgICAgLmZpbHRlcihhcHQgPT4gYXB0LnN0YXR1cyA9PT0gJ3NjaGVkdWxlZCcgJiYgYXB0LnNjaGVkdWxlZFRpbWUgPj0gbm93KVxuICAgICAgLnNvcnQoKGEsIGIpID0+IGEuc2NoZWR1bGVkVGltZS5nZXRUaW1lKCkgLSBiLnNjaGVkdWxlZFRpbWUuZ2V0VGltZSgpKTtcblxuICAgIGNvbnN0IG5leHRBcHBvaW50bWVudCA9IHVwY29taW5nQXBwb2ludG1lbnRzWzBdO1xuXG4gICAgLy8gR2V0IGFsZXJ0cyBkYXRhXG4gICAgY29uc3QgYWxlcnRzID0gYXdhaXQgZ2V0QWxlcnRzQnlVc2VyKHByaW1hcnlVc2VySWQpO1xuICAgIGNvbnN0IHVuYWNrbm93bGVkZ2VkQWxlcnRzID0gYWxlcnRzLmZpbHRlcihhbGVydCA9PiAhYWxlcnQuYWNrbm93bGVkZ2VkKTtcbiAgICBjb25zdCBjcml0aWNhbEFsZXJ0cyA9IHVuYWNrbm93bGVkZ2VkQWxlcnRzLmZpbHRlcihhbGVydCA9PiBhbGVydC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJyk7XG4gICAgY29uc3QgcmVjZW50QWxlcnRzID0gYWxlcnRzXG4gICAgICAuc29ydCgoYSwgYikgPT4gYi50aW1lc3RhbXAuZ2V0VGltZSgpIC0gYS50aW1lc3RhbXAuZ2V0VGltZSgpKVxuICAgICAgLnNsaWNlKDAsIDUpXG4gICAgICAubWFwKGFsZXJ0ID0+ICh7XG4gICAgICAgIGlkOiBhbGVydC5pZCxcbiAgICAgICAgdHlwZTogYWxlcnQudHlwZSxcbiAgICAgICAgc2V2ZXJpdHk6IGFsZXJ0LnNldmVyaXR5LFxuICAgICAgICBtZXNzYWdlOiBhbGVydC5tZXNzYWdlLFxuICAgICAgICB0aW1lc3RhbXA6IGFsZXJ0LnRpbWVzdGFtcC50b0lTT1N0cmluZygpLFxuICAgICAgfSkpO1xuXG4gICAgLy8gQnVpbGQgZGFzaGJvYXJkIGRhdGFcbiAgICBjb25zdCBkYXNoYm9hcmQ6IERhc2hib2FyZERhdGEgPSB7XG4gICAgICBwcmltYXJ5VXNlcjoge1xuICAgICAgICBpZDogcHJpbWFyeVVzZXJJZCxcbiAgICAgICAgbmFtZTogYCR7cHJpbWFyeVVzZXIucHJvZmlsZS5maXJzdE5hbWV9ICR7cHJpbWFyeVVzZXIucHJvZmlsZS5sYXN0TmFtZX1gLFxuICAgICAgICBsYXN0QWN0aXZlOiBwcmltYXJ5VXNlci5sYXN0QWN0aXZlLnRvSVNPU3RyaW5nKCksXG4gICAgICB9LFxuICAgICAgaGVhbHRoU3RhdHVzOiB7XG4gICAgICAgIGxhdGVzdFZpdGFscyxcbiAgICAgICAgdml0YWxzVHJlbmQsXG4gICAgICAgIGxhc3RSZWNvcmRlZDogbGF0ZXN0Vml0YWxzPy50aW1lc3RhbXAudG9JU09TdHJpbmcoKSxcbiAgICAgIH0sXG4gICAgICBtZWRpY2F0aW9uczoge1xuICAgICAgICB1cGNvbWluZ0NvdW50OiB1cGNvbWluZ01lZGljYXRpb25zLmxlbmd0aCxcbiAgICAgICAgYWRoZXJlbmNlU2NvcmUsXG4gICAgICAgIG1pc3NlZFRvZGF5OiBtaXNzZWRUb2RheS5sZW5ndGgsXG4gICAgICB9LFxuICAgICAgYXBwb2ludG1lbnRzOiB7XG4gICAgICAgIG5leHRBcHBvaW50bWVudDogbmV4dEFwcG9pbnRtZW50ID8ge1xuICAgICAgICAgIHByb3ZpZGVyOiBuZXh0QXBwb2ludG1lbnQucHJvdmlkZXIubmFtZSxcbiAgICAgICAgICB0eXBlOiBuZXh0QXBwb2ludG1lbnQudHlwZSxcbiAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXh0QXBwb2ludG1lbnQuc2NoZWR1bGVkVGltZS50b0lTT1N0cmluZygpLFxuICAgICAgICB9IDogdW5kZWZpbmVkLFxuICAgICAgICB1cGNvbWluZ0NvdW50OiB1cGNvbWluZ0FwcG9pbnRtZW50cy5sZW5ndGgsXG4gICAgICB9LFxuICAgICAgYWxlcnRzOiB7XG4gICAgICAgIHVuYWNrbm93bGVkZ2VkQ291bnQ6IHVuYWNrbm93bGVkZ2VkQWxlcnRzLmxlbmd0aCxcbiAgICAgICAgY3JpdGljYWxDb3VudDogY3JpdGljYWxBbGVydHMubGVuZ3RoLFxuICAgICAgICByZWNlbnRBbGVydHMsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIGRhc2hib2FyZCxcbiAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBjYXJlIGNpcmNsZSBkYXNoYm9hcmQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZXRyaWV2ZSBkYXNoYm9hcmQgZGF0YScpO1xuICB9XG59XG4iXX0=