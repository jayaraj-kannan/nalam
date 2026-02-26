"use strict";
// Schedule Medication Lambda Function
// Requirements: 2.1, 2.4
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const medications_1 = require("../shared/data-access/medications");
const audit_logger_1 = require("../shared/audit-logger");
async function handler(event) {
    try {
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.userId || !request.medication || !request.scheduledTime) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: userId, medication, scheduledTime');
        }
        // Validate medication fields
        if (!request.medication.name || !request.medication.dosage || !request.medication.frequency) {
            return (0, types_1.createErrorResponse)(400, 'Medication must include name, dosage, and frequency');
        }
        // Create medication record
        const medicationId = await (0, medications_1.createMedicationRecord)({
            userId: request.userId,
            medication: request.medication,
            scheduledTime: new Date(request.scheduledTime),
            status: 'scheduled',
            adherenceScore: 100, // Initial score
        });
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            eventType: 'MEDICATION_SCHEDULED',
            userId: request.userId,
            userType: 'primary',
            action: 'SCHEDULE_MEDICATION',
            resource: `medication/${medicationId}`,
            timestamp: new Date().toISOString(),
            success: true,
        });
        return (0, types_1.createSuccessResponse)({
            medicationId,
            message: 'Medication scheduled successfully',
        });
    }
    catch (error) {
        console.error('Error scheduling medication:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to schedule medication');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZWR1bGUtbWVkaWNhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjaGVkdWxlLW1lZGljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHNDQUFzQztBQUN0Qyx5QkFBeUI7O0FBYXpCLDBCQStDQztBQXpERCwyQ0FBeUY7QUFDekYsbUVBQTJFO0FBQzNFLHlEQUF1RDtBQVFoRCxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQThCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxFLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDckUsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0REFBNEQsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVGLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUscURBQXFELENBQUMsQ0FBQztRQUN6RixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBQSxvQ0FBc0IsRUFBQztZQUNoRCxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLGFBQWEsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQzlDLE1BQU0sRUFBRSxXQUFXO1lBQ25CLGNBQWMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCO1NBQ3RDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLElBQUEsNEJBQWEsRUFBQztZQUNsQixTQUFTLEVBQUUsc0JBQXNCO1lBQ2pDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUscUJBQXFCO1lBQzdCLFFBQVEsRUFBRSxjQUFjLFlBQVksRUFBRTtZQUN0QyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDbkMsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsWUFBWTtZQUNaLE9BQU8sRUFBRSxtQ0FBbUM7U0FDN0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsK0JBQStCLENBQUMsQ0FBQztJQUNuRSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNjaGVkdWxlIE1lZGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDIuMSwgMi40XG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSwgTWVkaWNhdGlvbiB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBjcmVhdGVNZWRpY2F0aW9uUmVjb3JkIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL21lZGljYXRpb25zJztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuaW50ZXJmYWNlIFNjaGVkdWxlTWVkaWNhdGlvblJlcXVlc3Qge1xuICB1c2VySWQ6IHN0cmluZztcbiAgbWVkaWNhdGlvbjogTWVkaWNhdGlvbjtcbiAgc2NoZWR1bGVkVGltZTogc3RyaW5nOyAvLyBJU08gc3RyaW5nXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBTY2hlZHVsZU1lZGljYXRpb25SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghcmVxdWVzdC51c2VySWQgfHwgIXJlcXVlc3QubWVkaWNhdGlvbiB8fCAhcmVxdWVzdC5zY2hlZHVsZWRUaW1lKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogdXNlcklkLCBtZWRpY2F0aW9uLCBzY2hlZHVsZWRUaW1lJyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgbWVkaWNhdGlvbiBmaWVsZHNcbiAgICBpZiAoIXJlcXVlc3QubWVkaWNhdGlvbi5uYW1lIHx8ICFyZXF1ZXN0Lm1lZGljYXRpb24uZG9zYWdlIHx8ICFyZXF1ZXN0Lm1lZGljYXRpb24uZnJlcXVlbmN5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNZWRpY2F0aW9uIG11c3QgaW5jbHVkZSBuYW1lLCBkb3NhZ2UsIGFuZCBmcmVxdWVuY3knKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbWVkaWNhdGlvbiByZWNvcmRcbiAgICBjb25zdCBtZWRpY2F0aW9uSWQgPSBhd2FpdCBjcmVhdGVNZWRpY2F0aW9uUmVjb3JkKHtcbiAgICAgIHVzZXJJZDogcmVxdWVzdC51c2VySWQsXG4gICAgICBtZWRpY2F0aW9uOiByZXF1ZXN0Lm1lZGljYXRpb24sXG4gICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZShyZXF1ZXN0LnNjaGVkdWxlZFRpbWUpLFxuICAgICAgc3RhdHVzOiAnc2NoZWR1bGVkJyxcbiAgICAgIGFkaGVyZW5jZVNjb3JlOiAxMDAsIC8vIEluaXRpYWwgc2NvcmVcbiAgICB9KTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgZXZlbnRUeXBlOiAnTUVESUNBVElPTl9TQ0hFRFVMRUQnLFxuICAgICAgdXNlcklkOiByZXF1ZXN0LnVzZXJJZCxcbiAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICBhY3Rpb246ICdTQ0hFRFVMRV9NRURJQ0FUSU9OJyxcbiAgICAgIHJlc291cmNlOiBgbWVkaWNhdGlvbi8ke21lZGljYXRpb25JZH1gLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBtZWRpY2F0aW9uSWQsXG4gICAgICBtZXNzYWdlOiAnTWVkaWNhdGlvbiBzY2hlZHVsZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzY2hlZHVsaW5nIG1lZGljYXRpb246JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBzY2hlZHVsZSBtZWRpY2F0aW9uJyk7XG4gIH1cbn1cbiJdfQ==