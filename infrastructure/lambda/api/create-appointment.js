"use strict";
// Create Appointment Lambda Function
// Requirements: 6.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const types_1 = require("../shared/types");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const eventBridgeClient = new client_eventbridge_1.EventBridgeClient({});
async function handler(event) {
    try {
        console.log('Create appointment request:', JSON.stringify(event));
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.userId || !request.provider || !request.type || !request.scheduledTime) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: userId, provider, type, scheduledTime');
        }
        // Validate appointment type
        const validTypes = ['checkup', 'specialist', 'emergency', 'follow_up', 'procedure', 'lab_work'];
        if (!validTypes.includes(request.type)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid appointment type');
        }
        // Parse scheduled time
        const scheduledTime = new Date(request.scheduledTime);
        if (isNaN(scheduledTime.getTime())) {
            return (0, types_1.createErrorResponse)(400, 'Invalid scheduledTime format');
        }
        // Validate scheduled time is in the future
        if (scheduledTime <= new Date()) {
            return (0, types_1.createErrorResponse)(400, 'Scheduled time must be in the future');
        }
        // Set default reminders if not provided
        const reminders = request.reminders || {
            enabled: true,
            times: [24, 2], // 24 hours and 2 hours before
            channels: ['push', 'sms', 'email'],
        };
        // Create appointment record
        const appointmentId = await (0, appointments_1.createAppointment)({
            userId: request.userId,
            provider: request.provider,
            type: request.type,
            scheduledTime,
            duration: request.duration,
            status: 'scheduled',
            reminders,
            location: request.location,
            notes: request.notes,
            preparationInstructions: request.preparationInstructions,
        });
        console.log('Appointment created:', appointmentId);
        // Publish event to EventBridge for care circle notification
        try {
            await eventBridgeClient.send(new client_eventbridge_1.PutEventsCommand({
                Entries: [{
                        Source: 'healthcare.appointments',
                        DetailType: 'AppointmentCreated',
                        Detail: JSON.stringify({
                            appointmentId,
                            userId: request.userId,
                            scheduledTime: scheduledTime.toISOString(),
                            type: request.type,
                            provider: request.provider.name,
                        }),
                        EventBusName: process.env.EVENT_BUS_NAME || 'healthcare-events-dev',
                    }],
            }));
        }
        catch (error) {
            console.error('Error publishing AppointmentCreated event:', error);
            // Don't fail the request if event publishing fails
        }
        return (0, types_1.createSuccessResponse)({
            appointmentId,
            message: 'Appointment created successfully',
        });
    }
    catch (error) {
        console.error('Error creating appointment:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to create appointment');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLWFwcG9pbnRtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLWFwcG9pbnRtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsb0JBQW9COztBQXNCcEIsMEJBcUZDO0FBeEdELHFFQUF1RTtBQUV2RSwyQ0FBc0k7QUFDdEksb0VBQWtGO0FBRWxGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxzQ0FBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQWM3QyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWxFLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQTZCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWpFLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BGLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsZ0VBQWdFLENBQUMsQ0FBQztRQUNwRyxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sVUFBVSxHQUFHLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxP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dGUgQXBwb2ludG1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDYuNVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVBcHBvaW50bWVudCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgZ2V0Q2FyZUNpcmNsZU1lbWJlcnMgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBBcHBvaW50bWVudFJlY29yZCwgSGVhbHRoY2FyZVByb3ZpZGVyLCBSZW1pbmRlclNldHRpbmdzIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IEV2ZW50QnJpZGdlQ2xpZW50LCBQdXRFdmVudHNDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWV2ZW50YnJpZGdlJztcblxuY29uc3QgZXZlbnRCcmlkZ2VDbGllbnQgPSBuZXcgRXZlbnRCcmlkZ2VDbGllbnQoe30pO1xuXG5pbnRlcmZhY2UgQ3JlYXRlQXBwb2ludG1lbnRSZXF1ZXN0IHtcbiAgdXNlcklkOiBzdHJpbmc7XG4gIHByb3ZpZGVyOiBIZWFsdGhjYXJlUHJvdmlkZXI7XG4gIHR5cGU6ICdjaGVja3VwJyB8ICdzcGVjaWFsaXN0JyB8ICdlbWVyZ2VuY3knIHwgJ2ZvbGxvd191cCcgfCAncHJvY2VkdXJlJyB8ICdsYWJfd29yayc7XG4gIHNjaGVkdWxlZFRpbWU6IHN0cmluZzsgLy8gSVNPIHRpbWVzdGFtcFxuICBkdXJhdGlvbj86IG51bWJlcjsgLy8gbWludXRlc1xuICByZW1pbmRlcnM/OiBSZW1pbmRlclNldHRpbmdzO1xuICBsb2NhdGlvbj86IHN0cmluZztcbiAgbm90ZXM/OiBzdHJpbmc7XG4gIHByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgYXBwb2ludG1lbnQgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBDcmVhdGVBcHBvaW50bWVudFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgaWYgKCFyZXF1ZXN0LnVzZXJJZCB8fCAhcmVxdWVzdC5wcm92aWRlciB8fCAhcmVxdWVzdC50eXBlIHx8ICFyZXF1ZXN0LnNjaGVkdWxlZFRpbWUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiB1c2VySWQsIHByb3ZpZGVyLCB0eXBlLCBzY2hlZHVsZWRUaW1lJyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgYXBwb2ludG1lbnQgdHlwZVxuICAgIGNvbnN0IHZhbGlkVHlwZXMgPSBbJ2NoZWNrdXAnLCAnc3BlY2lhbGlzdCcsICdlbWVyZ2VuY3knLCAnZm9sbG93X3VwJywgJ3Byb2NlZHVyZScsICdsYWJfd29yayddO1xuICAgIGlmICghdmFsaWRUeXBlcy5pbmNsdWRlcyhyZXF1ZXN0LnR5cGUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGFwcG9pbnRtZW50IHR5cGUnKTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBzY2hlZHVsZWQgdGltZVxuICAgIGNvbnN0IHNjaGVkdWxlZFRpbWUgPSBuZXcgRGF0ZShyZXF1ZXN0LnNjaGVkdWxlZFRpbWUpO1xuICAgIGlmIChpc05hTihzY2hlZHVsZWRUaW1lLmdldFRpbWUoKSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ludmFsaWQgc2NoZWR1bGVkVGltZSBmb3JtYXQnKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBzY2hlZHVsZWQgdGltZSBpcyBpbiB0aGUgZnV0dXJlXG4gICAgaWYgKHNjaGVkdWxlZFRpbWUgPD0gbmV3IERhdGUoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnU2NoZWR1bGVkIHRpbWUgbXVzdCBiZSBpbiB0aGUgZnV0dXJlJyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGRlZmF1bHQgcmVtaW5kZXJzIGlmIG5vdCBwcm92aWRlZFxuICAgIGNvbnN0IHJlbWluZGVyczogUmVtaW5kZXJTZXR0aW5ncyA9IHJlcXVlc3QucmVtaW5kZXJzIHx8IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICB0aW1lczogWzI0LCAyXSwgLy8gMjQgaG91cnMgYW5kIDIgaG91cnMgYmVmb3JlXG4gICAgICBjaGFubmVsczogWydwdXNoJywgJ3NtcycsICdlbWFpbCddLFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYXBwb2ludG1lbnQgcmVjb3JkXG4gICAgY29uc3QgYXBwb2ludG1lbnRJZCA9IGF3YWl0IGNyZWF0ZUFwcG9pbnRtZW50KHtcbiAgICAgIHVzZXJJZDogcmVxdWVzdC51c2VySWQsXG4gICAgICBwcm92aWRlcjogcmVxdWVzdC5wcm92aWRlcixcbiAgICAgIHR5cGU6IHJlcXVlc3QudHlwZSxcbiAgICAgIHNjaGVkdWxlZFRpbWUsXG4gICAgICBkdXJhdGlvbjogcmVxdWVzdC5kdXJhdGlvbixcbiAgICAgIHN0YXR1czogJ3NjaGVkdWxlZCcsXG4gICAgICByZW1pbmRlcnMsXG4gICAgICBsb2NhdGlvbjogcmVxdWVzdC5sb2NhdGlvbixcbiAgICAgIG5vdGVzOiByZXF1ZXN0Lm5vdGVzLFxuICAgICAgcHJlcGFyYXRpb25JbnN0cnVjdGlvbnM6IHJlcXVlc3QucHJlcGFyYXRpb25JbnN0cnVjdGlvbnMsXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnQXBwb2ludG1lbnQgY3JlYXRlZDonLCBhcHBvaW50bWVudElkKTtcblxuICAgIC8vIFB1Ymxpc2ggZXZlbnQgdG8gRXZlbnRCcmlkZ2UgZm9yIGNhcmUgY2lyY2xlIG5vdGlmaWNhdGlvblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBldmVudEJyaWRnZUNsaWVudC5zZW5kKG5ldyBQdXRFdmVudHNDb21tYW5kKHtcbiAgICAgICAgRW50cmllczogW3tcbiAgICAgICAgICBTb3VyY2U6ICdoZWFsdGhjYXJlLmFwcG9pbnRtZW50cycsXG4gICAgICAgICAgRGV0YWlsVHlwZTogJ0FwcG9pbnRtZW50Q3JlYXRlZCcsXG4gICAgICAgICAgRGV0YWlsOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBhcHBvaW50bWVudElkLFxuICAgICAgICAgICAgdXNlcklkOiByZXF1ZXN0LnVzZXJJZCxcbiAgICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IHNjaGVkdWxlZFRpbWUudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHR5cGU6IHJlcXVlc3QudHlwZSxcbiAgICAgICAgICAgIHByb3ZpZGVyOiByZXF1ZXN0LnByb3ZpZGVyLm5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgRXZlbnRCdXNOYW1lOiBwcm9jZXNzLmVudi5FVkVOVF9CVVNfTkFNRSB8fCAnaGVhbHRoY2FyZS1ldmVudHMtZGV2JyxcbiAgICAgICAgfV0sXG4gICAgICB9KSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHB1Ymxpc2hpbmcgQXBwb2ludG1lbnRDcmVhdGVkIGV2ZW50OicsIGVycm9yKTtcbiAgICAgIC8vIERvbid0IGZhaWwgdGhlIHJlcXVlc3QgaWYgZXZlbnQgcHVibGlzaGluZyBmYWlsc1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgYXBwb2ludG1lbnRJZCxcbiAgICAgIG1lc3NhZ2U6ICdBcHBvaW50bWVudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgYXBwb2ludG1lbnQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBjcmVhdGUgYXBwb2ludG1lbnQnKTtcbiAgfVxufVxuIl19