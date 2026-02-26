"use strict";
// Create Alert Lambda Function
// Requirements: 1.3, 2.3, 2.5, 3.1, 3.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const alerts_1 = require("../shared/data-access/alerts");
const audit_logger_1 = require("../shared/audit-logger");
async function handler(event) {
    try {
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.userId || !request.type || !request.severity || !request.message) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: userId, type, severity, message');
        }
        // Validate severity
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(request.severity)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid severity. Must be one of: low, medium, high, critical');
        }
        // Validate alert type
        const validTypes = ['vital_signs', 'medication', 'appointment', 'emergency', 'device', 'check_in', 'fall_detection'];
        if (!validTypes.includes(request.type)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid alert type');
        }
        // Create alert
        const alertId = await (0, alerts_1.createAlert)({
            userId: request.userId,
            type: request.type,
            severity: request.severity,
            message: request.message,
            timestamp: new Date(),
            acknowledged: false,
            escalated: false,
            relatedData: request.relatedData,
        });
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            eventType: 'ALERT_CREATED',
            userId: request.userId,
            userType: 'primary',
            action: 'CREATE_ALERT',
            resource: `alert/${alertId}`,
            timestamp: new Date().toISOString(),
            success: true,
        });
        return (0, types_1.createSuccessResponse)({
            alertId,
            message: 'Alert created successfully',
        });
    }
    catch (error) {
        console.error('Error creating alert:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to create alert');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLWFsZXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLWFsZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwrQkFBK0I7QUFDL0Isd0NBQXdDOztBQWV4QywwQkF5REM7QUFyRUQsMkNBQW9IO0FBQ3BILHlEQUEyRDtBQUMzRCx5REFBdUQ7QUFVaEQsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUF1QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzRCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5RSxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBEQUEwRCxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVELG9CQUFvQjtRQUNwQixNQUFNLGVBQWUsR0FBb0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNoRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLCtEQUErRCxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixNQUFNLFVBQVUsR0FBZ0IsQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsZUFBZTtRQUNmLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBQSxvQkFBVyxFQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsWUFBWSxFQUFFLEtBQUs7WUFDbkIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1NBQ2pDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLElBQUEsNEJBQWEsRUFBQztZQUNsQixTQUFTLEVBQUUsZUFBZTtZQUMxQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsTUFBTSxFQUFFLGNBQWM7WUFDdEIsUUFBUSxFQUFFLFNBQVMsT0FBTyxFQUFFO1lBQzVCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUNuQyxPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixPQUFPO1lBQ1AsT0FBTyxFQUFFLDRCQUE0QjtTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ3JlYXRlIEFsZXJ0IExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiAxLjMsIDIuMywgMi41LCAzLjEsIDMuMlxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UsIEhlYWx0aEFsZXJ0LCBBbGVydFR5cGUsIEFsZXJ0U2V2ZXJpdHkgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgY3JlYXRlQWxlcnQgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvYWxlcnRzJztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuaW50ZXJmYWNlIENyZWF0ZUFsZXJ0UmVxdWVzdCB7XG4gIHVzZXJJZDogc3RyaW5nO1xuICB0eXBlOiBBbGVydFR5cGU7XG4gIHNldmVyaXR5OiBBbGVydFNldmVyaXR5O1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIHJlbGF0ZWREYXRhPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBDcmVhdGVBbGVydFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgaWYgKCFyZXF1ZXN0LnVzZXJJZCB8fCAhcmVxdWVzdC50eXBlIHx8ICFyZXF1ZXN0LnNldmVyaXR5IHx8ICFyZXF1ZXN0Lm1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiB1c2VySWQsIHR5cGUsIHNldmVyaXR5LCBtZXNzYWdlJyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgc2V2ZXJpdHlcbiAgICBjb25zdCB2YWxpZFNldmVyaXRpZXM6IEFsZXJ0U2V2ZXJpdHlbXSA9IFsnbG93JywgJ21lZGl1bScsICdoaWdoJywgJ2NyaXRpY2FsJ107XG4gICAgaWYgKCF2YWxpZFNldmVyaXRpZXMuaW5jbHVkZXMocmVxdWVzdC5zZXZlcml0eSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ludmFsaWQgc2V2ZXJpdHkuIE11c3QgYmUgb25lIG9mOiBsb3csIG1lZGl1bSwgaGlnaCwgY3JpdGljYWwnKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBhbGVydCB0eXBlXG4gICAgY29uc3QgdmFsaWRUeXBlczogQWxlcnRUeXBlW10gPSBbJ3ZpdGFsX3NpZ25zJywgJ21lZGljYXRpb24nLCAnYXBwb2ludG1lbnQnLCAnZW1lcmdlbmN5JywgJ2RldmljZScsICdjaGVja19pbicsICdmYWxsX2RldGVjdGlvbiddO1xuICAgIGlmICghdmFsaWRUeXBlcy5pbmNsdWRlcyhyZXF1ZXN0LnR5cGUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGFsZXJ0IHR5cGUnKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYWxlcnRcbiAgICBjb25zdCBhbGVydElkID0gYXdhaXQgY3JlYXRlQWxlcnQoe1xuICAgICAgdXNlcklkOiByZXF1ZXN0LnVzZXJJZCxcbiAgICAgIHR5cGU6IHJlcXVlc3QudHlwZSxcbiAgICAgIHNldmVyaXR5OiByZXF1ZXN0LnNldmVyaXR5LFxuICAgICAgbWVzc2FnZTogcmVxdWVzdC5tZXNzYWdlLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxuICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgIGVzY2FsYXRlZDogZmFsc2UsXG4gICAgICByZWxhdGVkRGF0YTogcmVxdWVzdC5yZWxhdGVkRGF0YSxcbiAgICB9KTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgZXZlbnRUeXBlOiAnQUxFUlRfQ1JFQVRFRCcsXG4gICAgICB1c2VySWQ6IHJlcXVlc3QudXNlcklkLFxuICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgIGFjdGlvbjogJ0NSRUFURV9BTEVSVCcsXG4gICAgICByZXNvdXJjZTogYGFsZXJ0LyR7YWxlcnRJZH1gLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBhbGVydElkLFxuICAgICAgbWVzc2FnZTogJ0FsZXJ0IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBhbGVydDonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGNyZWF0ZSBhbGVydCcpO1xuICB9XG59XG4iXX0=