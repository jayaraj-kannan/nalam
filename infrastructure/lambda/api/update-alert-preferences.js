"use strict";
// Update Alert Preferences Lambda Function
// Requirements: 9.2
// Updates alert notification preferences for a care circle member
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const users_1 = require("../shared/data-access/users");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const audit_logger_1 = require("../shared/audit-logger");
/**
 * Validate notification channels
 */
function validateChannels(channels) {
    const validChannels = ['push', 'sms', 'email', 'voice'];
    return channels.every(channel => validChannels.includes(channel));
}
/**
 * Validate alert types
 */
function validateAlertTypes(alertTypes) {
    if (!alertTypes)
        return true;
    const validAlertTypes = [
        'vital_signs', 'medication', 'appointment', 'emergency',
        'device', 'check_in', 'fall_detection'
    ];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    for (const [type, config] of Object.entries(alertTypes)) {
        if (!validAlertTypes.includes(type)) {
            return false;
        }
        if (!config.urgencyLevels.every(level => validSeverities.includes(level))) {
            return false;
        }
    }
    return true;
}
/**
 * Validate quiet hours format
 */
function validateQuietHours(quietHours) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(quietHours.start) && timeRegex.test(quietHours.end);
}
async function handler(event) {
    try {
        // Get userId from path parameters
        const userId = event.pathParameters?.userId;
        if (!userId) {
            return (0, types_1.createErrorResponse)(400, 'userId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Users can only update their own preferences
        if (requestingUserId !== userId) {
            return (0, types_1.createErrorResponse)(403, 'You can only update your own alert preferences');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate channels if provided
        if (request.channels && !validateChannels(request.channels)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid notification channels');
        }
        // Validate alert types if provided
        if (request.alertTypes && !validateAlertTypes(request.alertTypes)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid alert types or urgency levels');
        }
        // Validate quiet hours if provided
        if (request.quietHours && !validateQuietHours(request.quietHours)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid quiet hours format (use HH:MM)');
        }
        // Get current user to merge preferences
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        // Merge with existing preferences
        const currentPreferences = user.alertPreferences || {
            channels: ['push', 'sms', 'email'],
            alertTypes: {},
        };
        const updatedPreferences = {
            channels: request.channels || currentPreferences.channels,
            quietHours: request.quietHours || currentPreferences.quietHours,
            alertTypes: {
                ...currentPreferences.alertTypes,
                ...request.alertTypes,
            },
        };
        // Update user preferences in DynamoDB
        await (0, dynamodb_client_1.updateItem)(dynamodb_client_1.TABLES.USERS, { userId }, 'SET alertPreferences = :preferences, lastActive = :lastActive', {
            ':preferences': updatedPreferences,
            ':lastActive': new Date().toISOString(),
        });
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId,
            action: 'update_alert_preferences',
            resourceType: 'user_preferences',
            resourceId: userId,
            details: {
                updatedFields: Object.keys(request),
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Alert preferences updated successfully',
            userId,
            preferences: updatedPreferences,
        });
    }
    catch (error) {
        console.error('Error updating alert preferences:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to update alert preferences');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWFsZXJ0LXByZWZlcmVuY2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBkYXRlLWFsZXJ0LXByZWZlcmVuY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQ0FBMkM7QUFDM0Msb0JBQW9CO0FBQ3BCLGtFQUFrRTs7QUEyRGxFLDBCQStGQztBQXZKRCwyQ0FBOEk7QUFDOUksdURBQXNEO0FBQ3RELCtEQUErRDtBQUMvRCx5REFBdUQ7QUFhdkQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLFFBQStCO0lBQ3ZELE1BQU0sYUFBYSxHQUEwQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9FLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGtCQUFrQixDQUFDLFVBQWtEO0lBQzVFLElBQUksQ0FBQyxVQUFVO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFN0IsTUFBTSxlQUFlLEdBQWdCO1FBQ25DLGFBQWEsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFdBQVc7UUFDdkQsUUFBUSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0I7S0FDdkMsQ0FBQztJQUNGLE1BQU0sZUFBZSxHQUFvQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRS9FLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDeEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDakQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1B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SUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztJQUN4RSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVwZGF0ZSBBbGVydCBQcmVmZXJlbmNlcyBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogOS4yXG4vLyBVcGRhdGVzIGFsZXJ0IG5vdGlmaWNhdGlvbiBwcmVmZXJlbmNlcyBmb3IgYSBjYXJlIGNpcmNsZSBtZW1iZXJcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBBbGVydFByZWZlcmVuY2VzLCBOb3RpZmljYXRpb25DaGFubmVsLCBBbGVydFR5cGUsIEFsZXJ0U2V2ZXJpdHkgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyB1cGRhdGVJdGVtLCBUQUJMRVMgfSBmcm9tICcuLi9zaGFyZWQvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuaW50ZXJmYWNlIFVwZGF0ZVByZWZlcmVuY2VzUmVxdWVzdCB7XG4gIGNoYW5uZWxzPzogTm90aWZpY2F0aW9uQ2hhbm5lbFtdO1xuICBxdWlldEhvdXJzPzogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZyB9O1xuICBhbGVydFR5cGVzPzoge1xuICAgIFtrZXkgaW4gQWxlcnRUeXBlXT86IHtcbiAgICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgICB1cmdlbmN5TGV2ZWxzOiBBbGVydFNldmVyaXR5W107XG4gICAgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBub3RpZmljYXRpb24gY2hhbm5lbHNcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVDaGFubmVscyhjaGFubmVsczogTm90aWZpY2F0aW9uQ2hhbm5lbFtdKTogYm9vbGVhbiB7XG4gIGNvbnN0IHZhbGlkQ2hhbm5lbHM6IE5vdGlmaWNhdGlvbkNoYW5uZWxbXSA9IFsncHVzaCcsICdzbXMnLCAnZW1haWwnLCAndm9pY2UnXTtcbiAgcmV0dXJuIGNoYW5uZWxzLmV2ZXJ5KGNoYW5uZWwgPT4gdmFsaWRDaGFubmVscy5pbmNsdWRlcyhjaGFubmVsKSk7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgYWxlcnQgdHlwZXNcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVBbGVydFR5cGVzKGFsZXJ0VHlwZXM6IFVwZGF0ZVByZWZlcmVuY2VzUmVxdWVzdFsnYWxlcnRUeXBlcyddKTogYm9vbGVhbiB7XG4gIGlmICghYWxlcnRUeXBlcykgcmV0dXJuIHRydWU7XG5cbiAgY29uc3QgdmFsaWRBbGVydFR5cGVzOiBBbGVydFR5cGVbXSA9IFtcbiAgICAndml0YWxfc2lnbnMnLCAnbWVkaWNhdGlvbicsICdhcHBvaW50bWVudCcsICdlbWVyZ2VuY3knLCBcbiAgICAnZGV2aWNlJywgJ2NoZWNrX2luJywgJ2ZhbGxfZGV0ZWN0aW9uJ1xuICBdO1xuICBjb25zdCB2YWxpZFNldmVyaXRpZXM6IEFsZXJ0U2V2ZXJpdHlbXSA9IFsnbG93JywgJ21lZGl1bScsICdoaWdoJywgJ2NyaXRpY2FsJ107XG5cbiAgZm9yIChjb25zdCBbdHlwZSwgY29uZmlnXSBvZiBPYmplY3QuZW50cmllcyhhbGVydFR5cGVzKSkge1xuICAgIGlmICghdmFsaWRBbGVydFR5cGVzLmluY2x1ZGVzKHR5cGUgYXMgQWxlcnRUeXBlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWNvbmZpZy51cmdlbmN5TGV2ZWxzLmV2ZXJ5KGxldmVsID0+IHZhbGlkU2V2ZXJpdGllcy5pbmNsdWRlcyhsZXZlbCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgcXVpZXQgaG91cnMgZm9ybWF0XG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlUXVpZXRIb3VycyhxdWlldEhvdXJzOiB7IHN0YXJ0OiBzdHJpbmc7IGVuZDogc3RyaW5nIH0pOiBib29sZWFuIHtcbiAgY29uc3QgdGltZVJlZ2V4ID0gL14oWzAxXVxcZHwyWzAtM10pOihbMC01XVxcZCkkLztcbiAgcmV0dXJuIHRpbWVSZWdleC50ZXN0KHF1aWV0SG91cnMuc3RhcnQpICYmIHRpbWVSZWdleC50ZXN0KHF1aWV0SG91cnMuZW5kKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkIGluIHBhdGgnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgcmVxdWVzdGluZyB1c2VyIGZyb20gYXV0aG9yaXplciBjb250ZXh0XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gVXNlcnMgY2FuIG9ubHkgdXBkYXRlIHRoZWlyIG93biBwcmVmZXJlbmNlc1xuICAgIGlmIChyZXF1ZXN0aW5nVXNlcklkICE9PSB1c2VySWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1lvdSBjYW4gb25seSB1cGRhdGUgeW91ciBvd24gYWxlcnQgcHJlZmVyZW5jZXMnKTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVlc3Q6IFVwZGF0ZVByZWZlcmVuY2VzUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG5cbiAgICAvLyBWYWxpZGF0ZSBjaGFubmVscyBpZiBwcm92aWRlZFxuICAgIGlmIChyZXF1ZXN0LmNoYW5uZWxzICYmICF2YWxpZGF0ZUNoYW5uZWxzKHJlcXVlc3QuY2hhbm5lbHMpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIG5vdGlmaWNhdGlvbiBjaGFubmVscycpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGFsZXJ0IHR5cGVzIGlmIHByb3ZpZGVkXG4gICAgaWYgKHJlcXVlc3QuYWxlcnRUeXBlcyAmJiAhdmFsaWRhdGVBbGVydFR5cGVzKHJlcXVlc3QuYWxlcnRUeXBlcykpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ludmFsaWQgYWxlcnQgdHlwZXMgb3IgdXJnZW5jeSBsZXZlbHMnKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBxdWlldCBob3VycyBpZiBwcm92aWRlZFxuICAgIGlmIChyZXF1ZXN0LnF1aWV0SG91cnMgJiYgIXZhbGlkYXRlUXVpZXRIb3VycyhyZXF1ZXN0LnF1aWV0SG91cnMpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIHF1aWV0IGhvdXJzIGZvcm1hdCAodXNlIEhIOk1NKScpO1xuICAgIH1cblxuICAgIC8vIEdldCBjdXJyZW50IHVzZXIgdG8gbWVyZ2UgcHJlZmVyZW5jZXNcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlcih1c2VySWQpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnVXNlciBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSB3aXRoIGV4aXN0aW5nIHByZWZlcmVuY2VzXG4gICAgY29uc3QgY3VycmVudFByZWZlcmVuY2VzID0gKHVzZXIgYXMgYW55KS5hbGVydFByZWZlcmVuY2VzIHx8IHtcbiAgICAgIGNoYW5uZWxzOiBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ10sXG4gICAgICBhbGVydFR5cGVzOiB7fSxcbiAgICB9O1xuXG4gICAgY29uc3QgdXBkYXRlZFByZWZlcmVuY2VzOiBBbGVydFByZWZlcmVuY2VzID0ge1xuICAgICAgY2hhbm5lbHM6IHJlcXVlc3QuY2hhbm5lbHMgfHwgY3VycmVudFByZWZlcmVuY2VzLmNoYW5uZWxzLFxuICAgICAgcXVpZXRIb3VyczogcmVxdWVzdC5xdWlldEhvdXJzIHx8IGN1cnJlbnRQcmVmZXJlbmNlcy5xdWlldEhvdXJzLFxuICAgICAgYWxlcnRUeXBlczoge1xuICAgICAgICAuLi5jdXJyZW50UHJlZmVyZW5jZXMuYWxlcnRUeXBlcyxcbiAgICAgICAgLi4ucmVxdWVzdC5hbGVydFR5cGVzLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gVXBkYXRlIHVzZXIgcHJlZmVyZW5jZXMgaW4gRHluYW1vREJcbiAgICBhd2FpdCB1cGRhdGVJdGVtKFxuICAgICAgVEFCTEVTLlVTRVJTLFxuICAgICAgeyB1c2VySWQgfSxcbiAgICAgICdTRVQgYWxlcnRQcmVmZXJlbmNlcyA9IDpwcmVmZXJlbmNlcywgbGFzdEFjdGl2ZSA9IDpsYXN0QWN0aXZlJyxcbiAgICAgIHtcbiAgICAgICAgJzpwcmVmZXJlbmNlcyc6IHVwZGF0ZWRQcmVmZXJlbmNlcyxcbiAgICAgICAgJzpsYXN0QWN0aXZlJzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIHVzZXJJZCxcbiAgICAgIGFjdGlvbjogJ3VwZGF0ZV9hbGVydF9wcmVmZXJlbmNlcycsXG4gICAgICByZXNvdXJjZVR5cGU6ICd1c2VyX3ByZWZlcmVuY2VzJyxcbiAgICAgIHJlc291cmNlSWQ6IHVzZXJJZCxcbiAgICAgIGRldGFpbHM6IHtcbiAgICAgICAgdXBkYXRlZEZpZWxkczogT2JqZWN0LmtleXMocmVxdWVzdCksXG4gICAgICB9LFxuICAgICAgaXBBZGRyZXNzOiBldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eT8uc291cmNlSXAsXG4gICAgICB1c2VyQWdlbnQ6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py51c2VyQWdlbnQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIG1lc3NhZ2U6ICdBbGVydCBwcmVmZXJlbmNlcyB1cGRhdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICB1c2VySWQsXG4gICAgICBwcmVmZXJlbmNlczogdXBkYXRlZFByZWZlcmVuY2VzLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGFsZXJ0IHByZWZlcmVuY2VzOicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gdXBkYXRlIGFsZXJ0IHByZWZlcmVuY2VzJyk7XG4gIH1cbn1cbiJdfQ==