"use strict";
// Audit Logging System
// Requirements: 8.4, 8.5 - Audit logging for all access events
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
exports.logDataAccess = logDataAccess;
exports.logPermissionChange = logPermissionChange;
exports.logCareCircleAccess = logCareCircleAccess;
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
const dynamodb_client_1 = require("./dynamodb-client");
const cloudwatchLogs = new client_cloudwatch_logs_1.CloudWatchLogsClient({});
const LOG_GROUP_NAME = process.env.AUDIT_LOG_GROUP || '/healthcare-monitoring/audit';
const LOG_STREAM_NAME = process.env.AUDIT_LOG_STREAM || 'access-events';
/**
 * Log an audit event to both CloudWatch Logs and DynamoDB
 * Requirements: 8.4 - Log all access events with timestamps
 */
async function logAuditEvent(event) {
    try {
        // Store in DynamoDB for queryable audit trail
        await (0, dynamodb_client_1.putItem)('audit-logs', {
            eventId: `${event.userId}-${Date.now()}`,
            ...event,
            ttl: Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60), // 7 years for HIPAA
        });
        // Also log to CloudWatch for real-time monitoring
        const logMessage = JSON.stringify(event);
        try {
            await cloudwatchLogs.send(new client_cloudwatch_logs_1.PutLogEventsCommand({
                logGroupName: LOG_GROUP_NAME,
                logStreamName: LOG_STREAM_NAME,
                logEvents: [
                    {
                        message: logMessage,
                        timestamp: Date.now(),
                    },
                ],
            }));
        }
        catch (cwError) {
            // Don't fail the operation if CloudWatch logging fails
            console.error('CloudWatch logging failed:', cwError);
        }
    }
    catch (error) {
        console.error('Audit logging failed:', error);
        // Don't throw - audit logging failure shouldn't break the application
    }
}
/**
 * Log data access event
 * Requirements: 8.4, 8.5 - Log all data access with user and permissions
 */
async function logDataAccess(userId, userType, targetUserId, dataType, action, success, permissionsChecked, metadata) {
    await logAuditEvent({
        eventType: 'DATA_ACCESS',
        userId,
        userType,
        targetUserId,
        dataType,
        action,
        timestamp: new Date().toISOString(),
        success,
        permissionsChecked,
        ...metadata,
    });
}
/**
 * Log permission change event
 * Requirements: 8.5 - Log all permission changes
 */
async function logPermissionChange(userId, userType, targetUserId, primaryUserId, oldPermissions, newPermissions, metadata) {
    await logAuditEvent({
        eventType: 'PERMISSION_CHANGE',
        userId,
        userType,
        targetUserId,
        timestamp: new Date().toISOString(),
        success: true,
        dataAccessed: [
            `Old: ${JSON.stringify(oldPermissions)}`,
            `New: ${JSON.stringify(newPermissions)}`,
            `Primary: ${primaryUserId}`,
        ],
        ...metadata,
    });
}
/**
 * Log care circle access event
 * Requirements: 8.4, 8.5 - Log care circle member access
 */
async function logCareCircleAccess(secondaryUserId, primaryUserId, action, success, permissionsChecked, metadata) {
    await logAuditEvent({
        eventType: 'CARE_CIRCLE_ACCESS',
        userId: secondaryUserId,
        userType: 'secondary',
        targetUserId: primaryUserId,
        action,
        timestamp: new Date().toISOString(),
        success,
        permissionsChecked,
        ...metadata,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXVkaXQtbG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXVkaXQtbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1QkFBdUI7QUFDdkIsK0RBQStEOztBQWdDL0Qsc0NBaUNDO0FBTUQsc0NBc0JDO0FBTUQsa0RBdUJDO0FBTUQsa0RBbUJDO0FBakpELDRFQUE0RjtBQUM1Rix1REFBb0Q7QUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVwRCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSw4QkFBOEIsQ0FBQztBQUNyRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixJQUFJLGVBQWUsQ0FBQztBQW9CeEU7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLGFBQWEsQ0FBQyxLQUFpQjtJQUNuRCxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFBLHlCQUFPLEVBQUMsWUFBWSxFQUFFO1lBQzFCLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3hDLEdBQUcsS0FBSztZQUNSLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxvQkFBb0I7U0FDcEYsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUN2QixJQUFJLDRDQUFtQixDQUFDO2dCQUN0QixZQUFZLEVBQUUsY0FBYztnQkFDNUIsYUFBYSxFQUFFLGVBQWU7Z0JBQzlCLFNBQVMsRUFBRTtvQkFDVDt3QkFDRSxPQUFPLEVBQUUsVUFBVTt3QkFDbkIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7cUJBQ3RCO2lCQUNGO2FBQ0YsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxPQUFPLEVBQUUsQ0FBQztZQUNqQix1REFBdUQ7WUFDdkQsT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlDLHNFQUFzRTtJQUN4RSxDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7R0FHRztBQUNJLEtBQUssVUFBVSxhQUFhLENBQ2pDLE1BQWMsRUFDZCxRQUFpQyxFQUNqQyxZQUFvQixFQUNwQixRQUFnQixFQUNoQixNQUFtQyxFQUNuQyxPQUFnQixFQUNoQixrQkFBNEIsRUFDNUIsUUFBa0M7SUFFbEMsTUFBTSxhQUFhLENBQUM7UUFDbEIsU0FBUyxFQUFFLGFBQWE7UUFDeEIsTUFBTTtRQUNOLFFBQVE7UUFDUixZQUFZO1FBQ1osUUFBUTtRQUNSLE1BQU07UUFDTixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDbkMsT0FBTztRQUNQLGtCQUFrQjtRQUNsQixHQUFHLFFBQVE7S0FDWixDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLG1CQUFtQixDQUN2QyxNQUFjLEVBQ2QsUUFBZ0IsRUFDaEIsWUFBb0IsRUFDcEIsYUFBcUIsRUFDckIsY0FBdUMsRUFDdkMsY0FBdUMsRUFDdkMsUUFBa0M7SUFFbEMsTUFBTSxhQUFhLENBQUM7UUFDbEIsU0FBUyxFQUFFLG1CQUFtQjtRQUM5QixNQUFNO1FBQ04sUUFBUTtRQUNSLFlBQVk7UUFDWixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDbkMsT0FBTyxFQUFFLElBQUk7UUFDYixZQUFZLEVBQUU7WUFDWixRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDeEMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3hDLFlBQVksYUFBYSxFQUFFO1NBQzVCO1FBQ0QsR0FBRyxRQUFRO0tBQ1osQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7R0FHRztBQUNJLEtBQUssVUFBVSxtQkFBbUIsQ0FDdkMsZUFBdUIsRUFDdkIsYUFBcUIsRUFDckIsTUFBYyxFQUNkLE9BQWdCLEVBQ2hCLGtCQUE0QixFQUM1QixRQUFrQztJQUVsQyxNQUFNLGFBQWEsQ0FBQztRQUNsQixTQUFTLEVBQUUsb0JBQW9CO1FBQy9CLE1BQU0sRUFBRSxlQUFlO1FBQ3ZCLFFBQVEsRUFBRSxXQUFXO1FBQ3JCLFlBQVksRUFBRSxhQUFhO1FBQzNCLE1BQU07UUFDTixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDbkMsT0FBTztRQUNQLGtCQUFrQjtRQUNsQixHQUFHLFFBQVE7S0FDWixDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQXVkaXQgTG9nZ2luZyBTeXN0ZW1cbi8vIFJlcXVpcmVtZW50czogOC40LCA4LjUgLSBBdWRpdCBsb2dnaW5nIGZvciBhbGwgYWNjZXNzIGV2ZW50c1xuXG5pbXBvcnQgeyBDbG91ZFdhdGNoTG9nc0NsaWVudCwgUHV0TG9nRXZlbnRzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZHdhdGNoLWxvZ3MnO1xuaW1wb3J0IHsgVEFCTEVTLCBwdXRJdGVtIH0gZnJvbSAnLi9keW5hbW9kYi1jbGllbnQnO1xuXG5jb25zdCBjbG91ZHdhdGNoTG9ncyA9IG5ldyBDbG91ZFdhdGNoTG9nc0NsaWVudCh7fSk7XG5cbmNvbnN0IExPR19HUk9VUF9OQU1FID0gcHJvY2Vzcy5lbnYuQVVESVRfTE9HX0dST1VQIHx8ICcvaGVhbHRoY2FyZS1tb25pdG9yaW5nL2F1ZGl0JztcbmNvbnN0IExPR19TVFJFQU1fTkFNRSA9IHByb2Nlc3MuZW52LkFVRElUX0xPR19TVFJFQU0gfHwgJ2FjY2Vzcy1ldmVudHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEF1ZGl0RXZlbnQge1xuICBldmVudFR5cGU6IHN0cmluZztcbiAgdXNlcklkOiBzdHJpbmc7XG4gIHVzZXJUeXBlOiBzdHJpbmc7XG4gIHJlc291cmNlPzogc3RyaW5nO1xuICBhY3Rpb24/OiBzdHJpbmc7XG4gIHRhcmdldFVzZXJJZD86IHN0cmluZztcbiAgZGF0YVR5cGU/OiBzdHJpbmc7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBpcEFkZHJlc3M/OiBzdHJpbmc7XG4gIHVzZXJBZ2VudD86IHN0cmluZztcbiAgZXJyb3JNZXNzYWdlPzogc3RyaW5nO1xuICBlbWFpbD86IHN0cmluZztcbiAgcGVybWlzc2lvbnNDaGVja2VkPzogc3RyaW5nW107XG4gIGRhdGFBY2Nlc3NlZD86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIExvZyBhbiBhdWRpdCBldmVudCB0byBib3RoIENsb3VkV2F0Y2ggTG9ncyBhbmQgRHluYW1vREJcbiAqIFJlcXVpcmVtZW50czogOC40IC0gTG9nIGFsbCBhY2Nlc3MgZXZlbnRzIHdpdGggdGltZXN0YW1wc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9nQXVkaXRFdmVudChldmVudDogQXVkaXRFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIC8vIFN0b3JlIGluIER5bmFtb0RCIGZvciBxdWVyeWFibGUgYXVkaXQgdHJhaWxcbiAgICBhd2FpdCBwdXRJdGVtKCdhdWRpdC1sb2dzJywge1xuICAgICAgZXZlbnRJZDogYCR7ZXZlbnQudXNlcklkfS0ke0RhdGUubm93KCl9YCxcbiAgICAgIC4uLmV2ZW50LFxuICAgICAgdHRsOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSArICg3ICogMzY1ICogMjQgKiA2MCAqIDYwKSwgLy8gNyB5ZWFycyBmb3IgSElQQUFcbiAgICB9KTtcblxuICAgIC8vIEFsc28gbG9nIHRvIENsb3VkV2F0Y2ggZm9yIHJlYWwtdGltZSBtb25pdG9yaW5nXG4gICAgY29uc3QgbG9nTWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KGV2ZW50KTtcbiAgICBcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2xvdWR3YXRjaExvZ3Muc2VuZChcbiAgICAgICAgbmV3IFB1dExvZ0V2ZW50c0NvbW1hbmQoe1xuICAgICAgICAgIGxvZ0dyb3VwTmFtZTogTE9HX0dST1VQX05BTUUsXG4gICAgICAgICAgbG9nU3RyZWFtTmFtZTogTE9HX1NUUkVBTV9OQU1FLFxuICAgICAgICAgIGxvZ0V2ZW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBtZXNzYWdlOiBsb2dNZXNzYWdlLFxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGN3RXJyb3IpIHtcbiAgICAgIC8vIERvbid0IGZhaWwgdGhlIG9wZXJhdGlvbiBpZiBDbG91ZFdhdGNoIGxvZ2dpbmcgZmFpbHNcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nsb3VkV2F0Y2ggbG9nZ2luZyBmYWlsZWQ6JywgY3dFcnJvcik7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0F1ZGl0IGxvZ2dpbmcgZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBEb24ndCB0aHJvdyAtIGF1ZGl0IGxvZ2dpbmcgZmFpbHVyZSBzaG91bGRuJ3QgYnJlYWsgdGhlIGFwcGxpY2F0aW9uXG4gIH1cbn1cblxuLyoqXG4gKiBMb2cgZGF0YSBhY2Nlc3MgZXZlbnRcbiAqIFJlcXVpcmVtZW50czogOC40LCA4LjUgLSBMb2cgYWxsIGRhdGEgYWNjZXNzIHdpdGggdXNlciBhbmQgcGVybWlzc2lvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ0RhdGFBY2Nlc3MoXG4gIHVzZXJJZDogc3RyaW5nLFxuICB1c2VyVHlwZTogJ3ByaW1hcnknIHwgJ3NlY29uZGFyeScsXG4gIHRhcmdldFVzZXJJZDogc3RyaW5nLFxuICBkYXRhVHlwZTogc3RyaW5nLFxuICBhY3Rpb246ICdyZWFkJyB8ICd3cml0ZScgfCAnZGVsZXRlJyxcbiAgc3VjY2VzczogYm9vbGVhbixcbiAgcGVybWlzc2lvbnNDaGVja2VkOiBzdHJpbmdbXSxcbiAgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgIGV2ZW50VHlwZTogJ0RBVEFfQUNDRVNTJyxcbiAgICB1c2VySWQsXG4gICAgdXNlclR5cGUsXG4gICAgdGFyZ2V0VXNlcklkLFxuICAgIGRhdGFUeXBlLFxuICAgIGFjdGlvbixcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdWNjZXNzLFxuICAgIHBlcm1pc3Npb25zQ2hlY2tlZCxcbiAgICAuLi5tZXRhZGF0YSxcbiAgfSk7XG59XG5cbi8qKlxuICogTG9nIHBlcm1pc3Npb24gY2hhbmdlIGV2ZW50XG4gKiBSZXF1aXJlbWVudHM6IDguNSAtIExvZyBhbGwgcGVybWlzc2lvbiBjaGFuZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dQZXJtaXNzaW9uQ2hhbmdlKFxuICB1c2VySWQ6IHN0cmluZyxcbiAgdXNlclR5cGU6IHN0cmluZyxcbiAgdGFyZ2V0VXNlcklkOiBzdHJpbmcsXG4gIHByaW1hcnlVc2VySWQ6IHN0cmluZyxcbiAgb2xkUGVybWlzc2lvbnM6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+LFxuICBuZXdQZXJtaXNzaW9uczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4sXG4gIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICBldmVudFR5cGU6ICdQRVJNSVNTSU9OX0NIQU5HRScsXG4gICAgdXNlcklkLFxuICAgIHVzZXJUeXBlLFxuICAgIHRhcmdldFVzZXJJZCxcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdWNjZXNzOiB0cnVlLFxuICAgIGRhdGFBY2Nlc3NlZDogW1xuICAgICAgYE9sZDogJHtKU09OLnN0cmluZ2lmeShvbGRQZXJtaXNzaW9ucyl9YCxcbiAgICAgIGBOZXc6ICR7SlNPTi5zdHJpbmdpZnkobmV3UGVybWlzc2lvbnMpfWAsXG4gICAgICBgUHJpbWFyeTogJHtwcmltYXJ5VXNlcklkfWAsXG4gICAgXSxcbiAgICAuLi5tZXRhZGF0YSxcbiAgfSk7XG59XG5cbi8qKlxuICogTG9nIGNhcmUgY2lyY2xlIGFjY2VzcyBldmVudFxuICogUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIExvZyBjYXJlIGNpcmNsZSBtZW1iZXIgYWNjZXNzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dDYXJlQ2lyY2xlQWNjZXNzKFxuICBzZWNvbmRhcnlVc2VySWQ6IHN0cmluZyxcbiAgcHJpbWFyeVVzZXJJZDogc3RyaW5nLFxuICBhY3Rpb246IHN0cmluZyxcbiAgc3VjY2VzczogYm9vbGVhbixcbiAgcGVybWlzc2lvbnNDaGVja2VkOiBzdHJpbmdbXSxcbiAgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgIGV2ZW50VHlwZTogJ0NBUkVfQ0lSQ0xFX0FDQ0VTUycsXG4gICAgdXNlcklkOiBzZWNvbmRhcnlVc2VySWQsXG4gICAgdXNlclR5cGU6ICdzZWNvbmRhcnknLFxuICAgIHRhcmdldFVzZXJJZDogcHJpbWFyeVVzZXJJZCxcbiAgICBhY3Rpb24sXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgc3VjY2VzcyxcbiAgICBwZXJtaXNzaW9uc0NoZWNrZWQsXG4gICAgLi4ubWV0YWRhdGEsXG4gIH0pO1xufVxuIl19