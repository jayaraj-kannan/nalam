"use strict";
// Escalate Alert Lambda Function
// Requirements: 3.1, 3.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const alerts_1 = require("../shared/data-access/alerts");
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
        if (!request.alertId || !request.timestamp || !request.escalationLevel) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: alertId, timestamp, escalationLevel');
        }
        // Validate escalation level
        const validLevels = ['care_circle', 'emergency_contact', 'emergency_services'];
        if (!validLevels.includes(request.escalationLevel)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid escalation level. Must be one of: care_circle, emergency_contact, emergency_services');
        }
        // Get the alert to verify it exists
        const alert = await (0, alerts_1.getAlert)(request.alertId, request.timestamp);
        if (!alert) {
            return (0, types_1.createErrorResponse)(404, 'Alert not found');
        }
        // Escalate the alert
        await (0, alerts_1.escalateAlert)(request.alertId, request.timestamp, request.escalationLevel);
        // Publish event to trigger escalation notifications
        await eventBridge.send(new client_eventbridge_1.PutEventsCommand({
            Entries: [{
                    Source: 'healthcare.alerts',
                    DetailType: 'AlertEscalated',
                    Detail: JSON.stringify({
                        alertId: request.alertId,
                        userId: alert.userId,
                        escalationLevel: request.escalationLevel,
                        severity: alert.severity,
                        type: alert.type,
                        message: alert.message,
                        timestamp: new Date().toISOString(),
                    }),
                    EventBusName: process.env.EVENT_BUS_NAME || 'default',
                }],
        }));
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            eventType: 'ALERT_ESCALATED',
            userId: alert.userId,
            userType: 'primary',
            action: 'ESCALATE_ALERT',
            resource: `alert/${request.alertId}`,
            timestamp: new Date().toISOString(),
            success: true,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Alert escalated successfully',
            alertId: request.alertId,
            escalationLevel: request.escalationLevel,
        });
    }
    catch (error) {
        console.error('Error escalating alert:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to escalate alert');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNjYWxhdGUtYWxlcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlc2NhbGF0ZS1hbGVydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDO0FBQ2pDLHlCQUF5Qjs7QUFnQnpCLDBCQW1FQztBQWhGRCwyQ0FBOEY7QUFDOUYseURBQXVFO0FBQ3ZFLHlEQUF1RDtBQUN2RCxvRUFBa0Y7QUFFbEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxzQ0FBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQVF2QyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQXlCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkUsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw4REFBOEQsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsTUFBTSxXQUFXLEdBQXNCLENBQUMsYUFBYSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw4RkFBOEYsQ0FBQyxDQUFDO1FBQ2xJLENBQUM7UUFFRCxvQ0FBb0M7UUFDcEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFBLGlCQUFRLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxJQUFBLHNCQUFhLEVBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVqRixvREFBb0Q7UUFDcEQsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUkscUNBQWdCLENBQUM7WUFDMUMsT0FBTyxFQUFFLENBQUM7b0JBQ1IsTUFBTSxFQUFFLG1CQUFtQjtvQkFDM0IsVUFBVSxFQUFFLGdCQUFnQjtvQkFDNUIsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7d0JBQ3JCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTzt3QkFDeEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO3dCQUNwQixlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWU7d0JBQ3hDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTt3QkFDeEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO3dCQUNoQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87d0JBQ3RCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtxQkFDcEMsQ0FBQztvQkFDRixZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksU0FBUztpQkFDdEQsQ0FBQztTQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosa0JBQWtCO1FBQ2xCLE1BQU0sSUFBQSw0QkFBYSxFQUFDO1lBQ2xCLFNBQVMsRUFBRSxpQkFBaUI7WUFDNUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLE1BQU0sRUFBRSxnQkFBZ0I7WUFDeEIsUUFBUSxFQUFFLFNBQVMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDbkMsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsT0FBTyxFQUFFLDhCQUE4QjtZQUN2QyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1NBQ3pDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDOUQsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBFc2NhbGF0ZSBBbGVydCBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogMy4xLCAzLjJcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBFc2NhbGF0aW9uTGV2ZWwgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgZXNjYWxhdGVBbGVydCwgZ2V0QWxlcnQgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvYWxlcnRzJztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcbmltcG9ydCB7IEV2ZW50QnJpZGdlQ2xpZW50LCBQdXRFdmVudHNDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWV2ZW50YnJpZGdlJztcblxuY29uc3QgZXZlbnRCcmlkZ2UgPSBuZXcgRXZlbnRCcmlkZ2VDbGllbnQoe30pO1xuXG5pbnRlcmZhY2UgRXNjYWxhdGVBbGVydFJlcXVlc3Qge1xuICBhbGVydElkOiBzdHJpbmc7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICBlc2NhbGF0aW9uTGV2ZWw6IEVzY2FsYXRpb25MZXZlbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3Q6IEVzY2FsYXRlQWxlcnRSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghcmVxdWVzdC5hbGVydElkIHx8ICFyZXF1ZXN0LnRpbWVzdGFtcCB8fCAhcmVxdWVzdC5lc2NhbGF0aW9uTGV2ZWwpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBhbGVydElkLCB0aW1lc3RhbXAsIGVzY2FsYXRpb25MZXZlbCcpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGVzY2FsYXRpb24gbGV2ZWxcbiAgICBjb25zdCB2YWxpZExldmVsczogRXNjYWxhdGlvbkxldmVsW10gPSBbJ2NhcmVfY2lyY2xlJywgJ2VtZXJnZW5jeV9jb250YWN0JywgJ2VtZXJnZW5jeV9zZXJ2aWNlcyddO1xuICAgIGlmICghdmFsaWRMZXZlbHMuaW5jbHVkZXMocmVxdWVzdC5lc2NhbGF0aW9uTGV2ZWwpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGVzY2FsYXRpb24gbGV2ZWwuIE11c3QgYmUgb25lIG9mOiBjYXJlX2NpcmNsZSwgZW1lcmdlbmN5X2NvbnRhY3QsIGVtZXJnZW5jeV9zZXJ2aWNlcycpO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgYWxlcnQgdG8gdmVyaWZ5IGl0IGV4aXN0c1xuICAgIGNvbnN0IGFsZXJ0ID0gYXdhaXQgZ2V0QWxlcnQocmVxdWVzdC5hbGVydElkLCByZXF1ZXN0LnRpbWVzdGFtcCk7XG4gICAgaWYgKCFhbGVydCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnQWxlcnQgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gRXNjYWxhdGUgdGhlIGFsZXJ0XG4gICAgYXdhaXQgZXNjYWxhdGVBbGVydChyZXF1ZXN0LmFsZXJ0SWQsIHJlcXVlc3QudGltZXN0YW1wLCByZXF1ZXN0LmVzY2FsYXRpb25MZXZlbCk7XG5cbiAgICAvLyBQdWJsaXNoIGV2ZW50IHRvIHRyaWdnZXIgZXNjYWxhdGlvbiBub3RpZmljYXRpb25zXG4gICAgYXdhaXQgZXZlbnRCcmlkZ2Uuc2VuZChuZXcgUHV0RXZlbnRzQ29tbWFuZCh7XG4gICAgICBFbnRyaWVzOiBbe1xuICAgICAgICBTb3VyY2U6ICdoZWFsdGhjYXJlLmFsZXJ0cycsXG4gICAgICAgIERldGFpbFR5cGU6ICdBbGVydEVzY2FsYXRlZCcsXG4gICAgICAgIERldGFpbDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGFsZXJ0SWQ6IHJlcXVlc3QuYWxlcnRJZCxcbiAgICAgICAgICB1c2VySWQ6IGFsZXJ0LnVzZXJJZCxcbiAgICAgICAgICBlc2NhbGF0aW9uTGV2ZWw6IHJlcXVlc3QuZXNjYWxhdGlvbkxldmVsLFxuICAgICAgICAgIHNldmVyaXR5OiBhbGVydC5zZXZlcml0eSxcbiAgICAgICAgICB0eXBlOiBhbGVydC50eXBlLFxuICAgICAgICAgIG1lc3NhZ2U6IGFsZXJ0Lm1lc3NhZ2UsXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH0pLFxuICAgICAgICBFdmVudEJ1c05hbWU6IHByb2Nlc3MuZW52LkVWRU5UX0JVU19OQU1FIHx8ICdkZWZhdWx0JyxcbiAgICAgIH1dLFxuICAgIH0pKTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgZXZlbnRUeXBlOiAnQUxFUlRfRVNDQUxBVEVEJyxcbiAgICAgIHVzZXJJZDogYWxlcnQudXNlcklkLFxuICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgIGFjdGlvbjogJ0VTQ0FMQVRFX0FMRVJUJyxcbiAgICAgIHJlc291cmNlOiBgYWxlcnQvJHtyZXF1ZXN0LmFsZXJ0SWR9YCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0FsZXJ0IGVzY2FsYXRlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgYWxlcnRJZDogcmVxdWVzdC5hbGVydElkLFxuICAgICAgZXNjYWxhdGlvbkxldmVsOiByZXF1ZXN0LmVzY2FsYXRpb25MZXZlbCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBlc2NhbGF0aW5nIGFsZXJ0OicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gZXNjYWxhdGUgYWxlcnQnKTtcbiAgfVxufVxuIl19