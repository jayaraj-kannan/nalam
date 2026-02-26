"use strict";
// Acknowledge Alert Lambda Function
// Requirements: 9.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const alerts_1 = require("../shared/data-access/alerts");
const care_circle_1 = require("../shared/data-access/care-circle");
const audit_logger_1 = require("../shared/audit-logger");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const eventBridge = new client_eventbridge_1.EventBridgeClient({});
async function handler(event) {
    try {
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.alertId || !request.timestamp || !request.acknowledgedBy) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: alertId, timestamp, acknowledgedBy');
        }
        // Get the alert to verify it exists
        const alert = await (0, alerts_1.getAlert)(request.alertId, request.timestamp);
        if (!alert) {
            return (0, types_1.createErrorResponse)(404, 'Alert not found');
        }
        // Acknowledge the alert
        await (0, alerts_1.acknowledgeAlert)(request.alertId, request.timestamp, request.acknowledgedBy);
        // Get care circle members to notify them
        const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(alert.userId);
        // Publish event to notify care circle members
        await eventBridge.send(new client_eventbridge_1.PutEventsCommand({
            Entries: [{
                    Source: 'healthcare.alerts',
                    DetailType: 'AlertAcknowledged',
                    Detail: JSON.stringify({
                        alertId: request.alertId,
                        userId: alert.userId,
                        acknowledgedBy: request.acknowledgedBy,
                        acknowledgedAt: new Date().toISOString(),
                        careCircleMembers: careCircleMembers.map(m => m.secondaryUserId),
                    }),
                    EventBusName: process.env.EVENT_BUS_NAME || 'default',
                }],
        }));
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            eventType: 'ALERT_ACKNOWLEDGED',
            userId: request.acknowledgedBy,
            userType: 'secondary',
            action: 'ACKNOWLEDGE_ALERT',
            resource: `alert/${request.alertId}`,
            timestamp: new Date().toISOString(),
            success: true,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Alert acknowledged successfully',
            alertId: request.alertId,
        });
    }
    catch (error) {
        console.error('Error acknowledging alert:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to acknowledge alert');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNrbm93bGVkZ2UtYWxlcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhY2tub3dsZWRnZS1hbGVydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0NBQW9DO0FBQ3BDLG9CQUFvQjs7QUFpQnBCLDBCQTZEQztBQTNFRCwyQ0FBNkU7QUFDN0UseURBQTBFO0FBQzFFLG1FQUF5RTtBQUN6RSx5REFBdUQ7QUFDdkQsb0VBQWtGO0FBRWxGLE1BQU0sV0FBVyxHQUFHLElBQUksc0NBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFRdkMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRSwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RFLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNkRBQTZELENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBQSxpQkFBUSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLE1BQU0sSUFBQSx5QkFBZ0IsRUFBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRW5GLHlDQUF5QztRQUN6QyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBQSxrQ0FBb0IsRUFBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkUsOENBQThDO1FBQzlDLE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLHFDQUFnQixDQUFDO1lBQzFDLE9BQU8sRUFBRSxDQUFDO29CQUNSLE1BQU0sRUFBRSxtQkFBbUI7b0JBQzNCLFVBQVUsRUFBRSxtQkFBbUI7b0JBQy9CLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO3dCQUNyQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87d0JBQ3hCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTt3QkFDcEIsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO3dCQUN0QyxjQUFjLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7d0JBQ3hDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7cUJBQ2pFLENBQUM7b0JBQ0YsWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLFNBQVM7aUJBQ3RELENBQUM7U0FDSCxDQUFDLENBQUMsQ0FBQztRQUVKLGtCQUFrQjtRQUNsQixNQUFNLElBQUEsNEJBQWEsRUFBQztZQUNsQixTQUFTLEVBQUUsb0JBQW9CO1lBQy9CLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYztZQUM5QixRQUFRLEVBQUUsV0FBVztZQUNyQixNQUFNLEVBQUUsbUJBQW1CO1lBQzNCLFFBQVEsRUFBRSxTQUFTLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDcEMsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFBLDZCQUFxQixFQUFDO1lBQzNCLE9BQU8sRUFBRSxpQ0FBaUM7WUFDMUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1NBQ3pCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDZCQUE2QixDQUFDLENBQUM7SUFDakUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBY2tub3dsZWRnZSBBbGVydCBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogOS41XG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBhY2tub3dsZWRnZUFsZXJ0LCBnZXRBbGVydCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hbGVydHMnO1xuaW1wb3J0IHsgZ2V0Q2FyZUNpcmNsZU1lbWJlcnMgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0IHsgbG9nQXVkaXRFdmVudCB9IGZyb20gJy4uL3NoYXJlZC9hdWRpdC1sb2dnZXInO1xuaW1wb3J0IHsgRXZlbnRCcmlkZ2VDbGllbnQsIFB1dEV2ZW50c0NvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZXZlbnRicmlkZ2UnO1xuXG5jb25zdCBldmVudEJyaWRnZSA9IG5ldyBFdmVudEJyaWRnZUNsaWVudCh7fSk7XG5cbmludGVyZmFjZSBBY2tub3dsZWRnZUFsZXJ0UmVxdWVzdCB7XG4gIGFsZXJ0SWQ6IHN0cmluZztcbiAgdGltZXN0YW1wOiBzdHJpbmc7XG4gIGFja25vd2xlZGdlZEJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBBY2tub3dsZWRnZUFsZXJ0UmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG5cbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICBpZiAoIXJlcXVlc3QuYWxlcnRJZCB8fCAhcmVxdWVzdC50aW1lc3RhbXAgfHwgIXJlcXVlc3QuYWNrbm93bGVkZ2VkQnkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBhbGVydElkLCB0aW1lc3RhbXAsIGFja25vd2xlZGdlZEJ5Jyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBhbGVydCB0byB2ZXJpZnkgaXQgZXhpc3RzXG4gICAgY29uc3QgYWxlcnQgPSBhd2FpdCBnZXRBbGVydChyZXF1ZXN0LmFsZXJ0SWQsIHJlcXVlc3QudGltZXN0YW1wKTtcbiAgICBpZiAoIWFsZXJ0KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdBbGVydCBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBBY2tub3dsZWRnZSB0aGUgYWxlcnRcbiAgICBhd2FpdCBhY2tub3dsZWRnZUFsZXJ0KHJlcXVlc3QuYWxlcnRJZCwgcmVxdWVzdC50aW1lc3RhbXAsIHJlcXVlc3QuYWNrbm93bGVkZ2VkQnkpO1xuXG4gICAgLy8gR2V0IGNhcmUgY2lyY2xlIG1lbWJlcnMgdG8gbm90aWZ5IHRoZW1cbiAgICBjb25zdCBjYXJlQ2lyY2xlTWVtYmVycyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKGFsZXJ0LnVzZXJJZCk7XG5cbiAgICAvLyBQdWJsaXNoIGV2ZW50IHRvIG5vdGlmeSBjYXJlIGNpcmNsZSBtZW1iZXJzXG4gICAgYXdhaXQgZXZlbnRCcmlkZ2Uuc2VuZChuZXcgUHV0RXZlbnRzQ29tbWFuZCh7XG4gICAgICBFbnRyaWVzOiBbe1xuICAgICAgICBTb3VyY2U6ICdoZWFsdGhjYXJlLmFsZXJ0cycsXG4gICAgICAgIERldGFpbFR5cGU6ICdBbGVydEFja25vd2xlZGdlZCcsXG4gICAgICAgIERldGFpbDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGFsZXJ0SWQ6IHJlcXVlc3QuYWxlcnRJZCxcbiAgICAgICAgICB1c2VySWQ6IGFsZXJ0LnVzZXJJZCxcbiAgICAgICAgICBhY2tub3dsZWRnZWRCeTogcmVxdWVzdC5hY2tub3dsZWRnZWRCeSxcbiAgICAgICAgICBhY2tub3dsZWRnZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIGNhcmVDaXJjbGVNZW1iZXJzOiBjYXJlQ2lyY2xlTWVtYmVycy5tYXAobSA9PiBtLnNlY29uZGFyeVVzZXJJZCksXG4gICAgICAgIH0pLFxuICAgICAgICBFdmVudEJ1c05hbWU6IHByb2Nlc3MuZW52LkVWRU5UX0JVU19OQU1FIHx8ICdkZWZhdWx0JyxcbiAgICAgIH1dLFxuICAgIH0pKTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgZXZlbnRUeXBlOiAnQUxFUlRfQUNLTk9XTEVER0VEJyxcbiAgICAgIHVzZXJJZDogcmVxdWVzdC5hY2tub3dsZWRnZWRCeSxcbiAgICAgIHVzZXJUeXBlOiAnc2Vjb25kYXJ5JyxcbiAgICAgIGFjdGlvbjogJ0FDS05PV0xFREdFX0FMRVJUJyxcbiAgICAgIHJlc291cmNlOiBgYWxlcnQvJHtyZXF1ZXN0LmFsZXJ0SWR9YCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0FsZXJ0IGFja25vd2xlZGdlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgYWxlcnRJZDogcmVxdWVzdC5hbGVydElkLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFja25vd2xlZGdpbmcgYWxlcnQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBhY2tub3dsZWRnZSBhbGVydCcpO1xuICB9XG59XG4iXX0=