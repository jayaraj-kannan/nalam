"use strict";
// Trigger Emergency Alert Lambda Function
// Requirements: 3.3, 3.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const users_1 = require("../shared/data-access/users");
const care_circle_1 = require("../shared/data-access/care-circle");
const alerts_1 = require("../shared/data-access/alerts");
const audit_logger_1 = require("../shared/audit-logger");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const eventBridge = new client_eventbridge_1.EventBridgeClient({});
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamodbClient);
async function handler(event) {
    try {
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.userId || !request.type || !request.severity) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: userId, type, severity');
        }
        // Validate emergency type
        const validTypes = ['fall', 'abnormal_vitals', 'missed_check_in', 'manual_alert', 'device_alert'];
        if (!validTypes.includes(request.type)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid emergency type');
        }
        // Validate severity
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(request.severity)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid severity');
        }
        // Get user information including health profile
        const user = await (0, users_1.getUser)(request.userId);
        if (!user) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        // Get care circle members
        const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(request.userId);
        const responders = careCircleMembers
            .filter(m => m.permissions.canReceiveAlerts)
            .map(m => m.secondaryUserId);
        // Create emergency event ID
        const emergencyId = `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date();
        // Store emergency event
        const emergencyEvent = {
            id: emergencyId,
            userId: request.userId,
            type: request.type,
            timestamp,
            location: request.location,
            symptoms: request.symptoms,
            severity: request.severity,
            responders,
            resolved: false,
            notes: request.notes,
        };
        await dynamodb.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.EMERGENCY_EVENTS_TABLE || 'healthcare-emergency-events-dev',
            Item: {
                ...emergencyEvent,
                timestamp: timestamp.toISOString(),
            },
        }));
        // Create alert for the emergency
        const alertId = await (0, alerts_1.createAlert)({
            userId: request.userId,
            type: 'emergency',
            severity: request.severity === 'critical' ? 'critical' : 'high',
            message: `Emergency: ${request.type.replace(/_/g, ' ')}${request.symptoms ? ` - Symptoms: ${request.symptoms.join(', ')}` : ''}`,
            timestamp,
            acknowledged: false,
            escalated: true,
            escalationLevel: request.severity === 'critical' ? 'emergency_services' : 'emergency_contact',
            relatedData: {
                emergencyId,
                location: request.location,
                symptoms: request.symptoms,
            },
        });
        // Prepare emergency information for responders
        const emergencyInfo = {
            emergencyId,
            alertId,
            userId: request.userId,
            userName: `${user.profile.firstName} ${user.profile.lastName}`,
            type: request.type,
            severity: request.severity,
            timestamp: timestamp.toISOString(),
            location: request.location,
            symptoms: request.symptoms,
            // Medical history for emergency services (Requirement 3.5)
            medicalHistory: 'healthProfile' in user ? {
                conditions: user.healthProfile.conditions,
                medications: user.healthProfile.medications,
                allergies: user.healthProfile.allergies,
                emergencyContacts: user.healthProfile.emergencyContacts,
                healthcareProviders: user.healthProfile.healthcareProviders,
            } : undefined,
            responders,
        };
        // Publish emergency event to EventBridge for immediate notification
        await eventBridge.send(new client_eventbridge_1.PutEventsCommand({
            Entries: [{
                    Source: 'healthcare.emergency',
                    DetailType: 'EmergencyTriggered',
                    Detail: JSON.stringify(emergencyInfo),
                    EventBusName: process.env.EVENT_BUS_NAME || 'default',
                }],
        }));
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            eventType: 'EMERGENCY_TRIGGERED',
            userId: request.userId,
            userType: 'primary',
            action: 'TRIGGER_EMERGENCY',
            resource: `emergency/${emergencyId}`,
            timestamp: timestamp.toISOString(),
            success: true,
        });
        return (0, types_1.createSuccessResponse)({
            emergencyId,
            alertId,
            message: 'Emergency alert triggered successfully',
            responders: responders.length,
        });
    }
    catch (error) {
        console.error('Error triggering emergency:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to trigger emergency alert');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci1lbWVyZ2VuY3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cmlnZ2VyLWVtZXJnZW5jeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMENBQTBDO0FBQzFDLHlCQUF5Qjs7QUF5QnpCLDBCQXNJQztBQTVKRCwyQ0FBNEk7QUFDNUksdURBQXNEO0FBQ3RELG1FQUF5RTtBQUN6RSx5REFBMkQ7QUFDM0QseURBQXVEO0FBQ3ZELG9FQUFrRjtBQUNsRiw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRTNFLE1BQU0sV0FBVyxHQUFHLElBQUksc0NBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDOUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sUUFBUSxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQVd0RCxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQTRCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhFLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxpREFBaUQsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxVQUFVLEdBQW9CLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFF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Q0FBQyxDQUFDLFNBQVM7WUFDYixVQUFVO1NBQ1gsQ0FBQztRQUVGLG9FQUFvRTtRQUNwRSxNQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxxQ0FBZ0IsQ0FBQztZQUMxQyxPQUFPLEVBQUUsQ0FBQztvQkFDUixNQUFNLEVBQUUsc0JBQXNCO29CQUM5QixVQUFVLEVBQUUsb0JBQW9CO29CQUNoQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUM7b0JBQ3JDLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxTQUFTO2lCQUN0RCxDQUFDO1NBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSixrQkFBa0I7UUFDbEIsTUFBTSxJQUFBLDRCQUFhLEVBQUM7WUFDbEIsU0FBUyxFQUFFLHFCQUFxQjtZQUNoQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsTUFBTSxFQUFFLG1CQUFtQjtZQUMzQixRQUFRLEVBQUUsYUFBYSxXQUFXLEVBQUU7WUFDcEMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUU7WUFDbEMsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsV0FBVztZQUNYLE9BQU87WUFDUCxPQUFPLEVBQUUsd0NBQXdDO1lBQ2pELFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTTtTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVHJpZ2dlciBFbWVyZ2VuY3kgQWxlcnQgTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDMuMywgMy41XG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSwgRW1lcmdlbmN5RXZlbnQsIEVtZXJnZW5jeVNldmVyaXR5LCBFbWVyZ2VuY3lUeXBlLCBHZW9Mb2NhdGlvbiB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBnZXRVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXJzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGNyZWF0ZUFsZXJ0IH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FsZXJ0cyc7XG5pbXBvcnQgeyBsb2dBdWRpdEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5pbXBvcnQgeyBFdmVudEJyaWRnZUNsaWVudCwgUHV0RXZlbnRzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1ldmVudGJyaWRnZSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcblxuY29uc3QgZXZlbnRCcmlkZ2UgPSBuZXcgRXZlbnRCcmlkZ2VDbGllbnQoe30pO1xuY29uc3QgZHluYW1vZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZHluYW1vZGIgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vZGJDbGllbnQpO1xuXG5pbnRlcmZhY2UgVHJpZ2dlckVtZXJnZW5jeVJlcXVlc3Qge1xuICB1c2VySWQ6IHN0cmluZztcbiAgdHlwZTogRW1lcmdlbmN5VHlwZTtcbiAgc2V2ZXJpdHk6IEVtZXJnZW5jeVNldmVyaXR5O1xuICBsb2NhdGlvbj86IEdlb0xvY2F0aW9uO1xuICBzeW1wdG9tcz86IHN0cmluZ1tdO1xuICBub3Rlcz86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3Q6IFRyaWdnZXJFbWVyZ2VuY3lSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghcmVxdWVzdC51c2VySWQgfHwgIXJlcXVlc3QudHlwZSB8fCAhcmVxdWVzdC5zZXZlcml0eSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IHVzZXJJZCwgdHlwZSwgc2V2ZXJpdHknKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBlbWVyZ2VuY3kgdHlwZVxuICAgIGNvbnN0IHZhbGlkVHlwZXM6IEVtZXJnZW5jeVR5cGVbXSA9IFsnZmFsbCcsICdhYm5vcm1hbF92aXRhbHMnLCAnbWlzc2VkX2NoZWNrX2luJywgJ21hbnVhbF9hbGVydCcsICdkZXZpY2VfYWxlcnQnXTtcbiAgICBpZiAoIXZhbGlkVHlwZXMuaW5jbHVkZXMocmVxdWVzdC50eXBlKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnSW52YWxpZCBlbWVyZ2VuY3kgdHlwZScpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHNldmVyaXR5XG4gICAgY29uc3QgdmFsaWRTZXZlcml0aWVzOiBFbWVyZ2VuY3lTZXZlcml0eVtdID0gWydsb3cnLCAnbWVkaXVtJywgJ2hpZ2gnLCAnY3JpdGljYWwnXTtcbiAgICBpZiAoIXZhbGlkU2V2ZXJpdGllcy5pbmNsdWRlcyhyZXF1ZXN0LnNldmVyaXR5KSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnSW52YWxpZCBzZXZlcml0eScpO1xuICAgIH1cblxuICAgIC8vIEdldCB1c2VyIGluZm9ybWF0aW9uIGluY2x1ZGluZyBoZWFsdGggcHJvZmlsZVxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyKHJlcXVlc3QudXNlcklkKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGNhcmUgY2lyY2xlIG1lbWJlcnNcbiAgICBjb25zdCBjYXJlQ2lyY2xlTWVtYmVycyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHJlcXVlc3QudXNlcklkKTtcbiAgICBjb25zdCByZXNwb25kZXJzID0gY2FyZUNpcmNsZU1lbWJlcnNcbiAgICAgIC5maWx0ZXIobSA9PiBtLnBlcm1pc3Npb25zLmNhblJlY2VpdmVBbGVydHMpXG4gICAgICAubWFwKG0gPT4gbS5zZWNvbmRhcnlVc2VySWQpO1xuXG4gICAgLy8gQ3JlYXRlIGVtZXJnZW5jeSBldmVudCBJRFxuICAgIGNvbnN0IGVtZXJnZW5jeUlkID0gYGVtZXJnZW5jeS0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcblxuICAgIC8vIFN0b3JlIGVtZXJnZW5jeSBldmVudFxuICAgIGNvbnN0IGVtZXJnZW5jeUV2ZW50OiBFbWVyZ2VuY3lFdmVudCA9IHtcbiAgICAgIGlkOiBlbWVyZ2VuY3lJZCxcbiAgICAgIHVzZXJJZDogcmVxdWVzdC51c2VySWQsXG4gICAgICB0eXBlOiByZXF1ZXN0LnR5cGUsXG4gICAgICB0aW1lc3RhbXAsXG4gICAgICBsb2NhdGlvbjogcmVxdWVzdC5sb2NhdGlvbixcbiAgICAgIHN5bXB0b21zOiByZXF1ZXN0LnN5bXB0b21zLFxuICAgICAgc2V2ZXJpdHk6IHJlcXVlc3Quc2V2ZXJpdHksXG4gICAgICByZXNwb25kZXJzLFxuICAgICAgcmVzb2x2ZWQ6IGZhbHNlLFxuICAgICAgbm90ZXM6IHJlcXVlc3Qubm90ZXMsXG4gICAgfTtcblxuICAgIGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5FTUVSR0VOQ1lfRVZFTlRTX1RBQkxFIHx8ICdoZWFsdGhjYXJlLWVtZXJnZW5jeS1ldmVudHMtZGV2JyxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgLi4uZW1lcmdlbmN5RXZlbnQsXG4gICAgICAgIHRpbWVzdGFtcDogdGltZXN0YW1wLnRvSVNPU3RyaW5nKCksXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIENyZWF0ZSBhbGVydCBmb3IgdGhlIGVtZXJnZW5jeVxuICAgIGNvbnN0IGFsZXJ0SWQgPSBhd2FpdCBjcmVhdGVBbGVydCh7XG4gICAgICB1c2VySWQ6IHJlcXVlc3QudXNlcklkLFxuICAgICAgdHlwZTogJ2VtZXJnZW5jeScsXG4gICAgICBzZXZlcml0eTogcmVxdWVzdC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJyA/ICdjcml0aWNhbCcgOiAnaGlnaCcsXG4gICAgICBtZXNzYWdlOiBgRW1lcmdlbmN5OiAke3JlcXVlc3QudHlwZS5yZXBsYWNlKC9fL2csICcgJyl9JHtyZXF1ZXN0LnN5bXB0b21zID8gYCAtIFN5bXB0b21zOiAke3JlcXVlc3Quc3ltcHRvbXMuam9pbignLCAnKX1gIDogJyd9YCxcbiAgICAgIHRpbWVzdGFtcCxcbiAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICBlc2NhbGF0ZWQ6IHRydWUsXG4gICAgICBlc2NhbGF0aW9uTGV2ZWw6IHJlcXVlc3Quc2V2ZXJpdHkgPT09ICdjcml0aWNhbCcgPyAnZW1lcmdlbmN5X3NlcnZpY2VzJyA6ICdlbWVyZ2VuY3lfY29udGFjdCcsXG4gICAgICByZWxhdGVkRGF0YToge1xuICAgICAgICBlbWVyZ2VuY3lJZCxcbiAgICAgICAgbG9jYXRpb246IHJlcXVlc3QubG9jYXRpb24sXG4gICAgICAgIHN5bXB0b21zOiByZXF1ZXN0LnN5bXB0b21zLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFByZXBhcmUgZW1lcmdlbmN5IGluZm9ybWF0aW9uIGZvciByZXNwb25kZXJzXG4gICAgY29uc3QgZW1lcmdlbmN5SW5mbyA9IHtcbiAgICAgIGVtZXJnZW5jeUlkLFxuICAgICAgYWxlcnRJZCxcbiAgICAgIHVzZXJJZDogcmVxdWVzdC51c2VySWQsXG4gICAgICB1c2VyTmFtZTogYCR7dXNlci5wcm9maWxlLmZpcnN0TmFtZX0gJHt1c2VyLnByb2ZpbGUubGFzdE5hbWV9YCxcbiAgICAgIHR5cGU6IHJlcXVlc3QudHlwZSxcbiAgICAgIHNldmVyaXR5OiByZXF1ZXN0LnNldmVyaXR5LFxuICAgICAgdGltZXN0YW1wOiB0aW1lc3RhbXAudG9JU09TdHJpbmcoKSxcbiAgICAgIGxvY2F0aW9uOiByZXF1ZXN0LmxvY2F0aW9uLFxuICAgICAgc3ltcHRvbXM6IHJlcXVlc3Quc3ltcHRvbXMsXG4gICAgICAvLyBNZWRpY2FsIGhpc3RvcnkgZm9yIGVtZXJnZW5jeSBzZXJ2aWNlcyAoUmVxdWlyZW1lbnQgMy41KVxuICAgICAgbWVkaWNhbEhpc3Rvcnk6ICdoZWFsdGhQcm9maWxlJyBpbiB1c2VyID8ge1xuICAgICAgICBjb25kaXRpb25zOiB1c2VyLmhlYWx0aFByb2ZpbGUuY29uZGl0aW9ucyxcbiAgICAgICAgbWVkaWNhdGlvbnM6IHVzZXIuaGVhbHRoUHJvZmlsZS5tZWRpY2F0aW9ucyxcbiAgICAgICAgYWxsZXJnaWVzOiB1c2VyLmhlYWx0aFByb2ZpbGUuYWxsZXJnaWVzLFxuICAgICAgICBlbWVyZ2VuY3lDb250YWN0czogdXNlci5oZWFsdGhQcm9maWxlLmVtZXJnZW5jeUNvbnRhY3RzLFxuICAgICAgICBoZWFsdGhjYXJlUHJvdmlkZXJzOiB1c2VyLmhlYWx0aFByb2ZpbGUuaGVhbHRoY2FyZVByb3ZpZGVycyxcbiAgICAgIH0gOiB1bmRlZmluZWQsXG4gICAgICByZXNwb25kZXJzLFxuICAgIH07XG5cbiAgICAvLyBQdWJsaXNoIGVtZXJnZW5jeSBldmVudCB0byBFdmVudEJyaWRnZSBmb3IgaW1tZWRpYXRlIG5vdGlmaWNhdGlvblxuICAgIGF3YWl0IGV2ZW50QnJpZGdlLnNlbmQobmV3IFB1dEV2ZW50c0NvbW1hbmQoe1xuICAgICAgRW50cmllczogW3tcbiAgICAgICAgU291cmNlOiAnaGVhbHRoY2FyZS5lbWVyZ2VuY3knLFxuICAgICAgICBEZXRhaWxUeXBlOiAnRW1lcmdlbmN5VHJpZ2dlcmVkJyxcbiAgICAgICAgRGV0YWlsOiBKU09OLnN0cmluZ2lmeShlbWVyZ2VuY3lJbmZvKSxcbiAgICAgICAgRXZlbnRCdXNOYW1lOiBwcm9jZXNzLmVudi5FVkVOVF9CVVNfTkFNRSB8fCAnZGVmYXVsdCcsXG4gICAgICB9XSxcbiAgICB9KSk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIGV2ZW50VHlwZTogJ0VNRVJHRU5DWV9UUklHR0VSRUQnLFxuICAgICAgdXNlcklkOiByZXF1ZXN0LnVzZXJJZCxcbiAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICBhY3Rpb246ICdUUklHR0VSX0VNRVJHRU5DWScsXG4gICAgICByZXNvdXJjZTogYGVtZXJnZW5jeS8ke2VtZXJnZW5jeUlkfWAsXG4gICAgICB0aW1lc3RhbXA6IHRpbWVzdGFtcC50b0lTT1N0cmluZygpLFxuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgZW1lcmdlbmN5SWQsXG4gICAgICBhbGVydElkLFxuICAgICAgbWVzc2FnZTogJ0VtZXJnZW5jeSBhbGVydCB0cmlnZ2VyZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICAgIHJlc3BvbmRlcnM6IHJlc3BvbmRlcnMubGVuZ3RoLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHRyaWdnZXJpbmcgZW1lcmdlbmN5OicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gdHJpZ2dlciBlbWVyZ2VuY3kgYWxlcnQnKTtcbiAgfVxufVxuIl19