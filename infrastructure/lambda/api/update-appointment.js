"use strict";
// Update Appointment Lambda Function
// Requirements: 6.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const types_1 = require("../shared/types");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const eventBridgeClient = new client_eventbridge_1.EventBridgeClient({});
async function handler(event) {
    try {
        console.log('Update appointment request:', JSON.stringify(event));
        // Get parameters
        const userId = event.pathParameters?.userId;
        const appointmentId = event.pathParameters?.appointmentId;
        if (!userId || !appointmentId) {
            return (0, types_1.createErrorResponse)(400, 'userId and appointmentId are required');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate status if provided
        if (request.status) {
            const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'missed'];
            if (!validStatuses.includes(request.status)) {
                return (0, types_1.createErrorResponse)(400, 'Invalid appointment status');
            }
        }
        // Validate scheduledTime if provided
        let scheduledTime;
        if (request.scheduledTime) {
            scheduledTime = new Date(request.scheduledTime);
            if (isNaN(scheduledTime.getTime())) {
                return (0, types_1.createErrorResponse)(400, 'Invalid scheduledTime format');
            }
        }
        // Build updates object
        const updates = {};
        if (request.status)
            updates.status = request.status;
        if (scheduledTime)
            updates.scheduledTime = scheduledTime;
        if (request.duration !== undefined)
            updates.duration = request.duration;
        if (request.location !== undefined)
            updates.location = request.location;
        if (request.notes !== undefined)
            updates.notes = request.notes;
        if (request.preparationInstructions !== undefined) {
            updates.preparationInstructions = request.preparationInstructions;
        }
        // Update appointment
        await (0, appointments_1.updateAppointment)(userId, appointmentId, updates);
        console.log('Appointment updated:', appointmentId);
        // Publish event if status changed
        if (request.status) {
            try {
                const appointment = await (0, appointments_1.getAppointment)(userId, appointmentId);
                await eventBridgeClient.send(new client_eventbridge_1.PutEventsCommand({
                    Entries: [{
                            Source: 'healthcare.appointments',
                            DetailType: 'AppointmentStatusChanged',
                            Detail: JSON.stringify({
                                appointmentId,
                                userId,
                                status: request.status,
                                scheduledTime: appointment?.scheduledTime.toISOString(),
                            }),
                            EventBusName: process.env.EVENT_BUS_NAME || 'healthcare-events-dev',
                        }],
                }));
            }
            catch (error) {
                console.error('Error publishing AppointmentStatusChanged event:', error);
            }
        }
        return (0, types_1.createSuccessResponse)({
            message: 'Appointment updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating appointment:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to update appointment');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWFwcG9pbnRtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBkYXRlLWFwcG9pbnRtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsb0JBQW9COztBQWtCcEIsMEJBaUZDO0FBaEdELHFFQUF1RjtBQUN2RiwyQ0FBZ0c7QUFDaEcsb0VBQWtGO0FBRWxGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxzQ0FBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQVc3QyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWxFLGlCQUFpQjtRQUNqQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUM1QyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztRQUUxRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE2QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqRSw4QkFBOEI7UUFDOUIsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsTUFBTSxhQUFhLEdBQXdCLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsV0FB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QUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsOEJBQThCLENBQUMsQ0FBQztJQUNsRSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVwZGF0ZSBBcHBvaW50bWVudCBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNi41XG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IHVwZGF0ZUFwcG9pbnRtZW50LCBnZXRBcHBvaW50bWVudCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBBcHBvaW50bWVudFN0YXR1cyB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBFdmVudEJyaWRnZUNsaWVudCwgUHV0RXZlbnRzQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1ldmVudGJyaWRnZSc7XG5cbmNvbnN0IGV2ZW50QnJpZGdlQ2xpZW50ID0gbmV3IEV2ZW50QnJpZGdlQ2xpZW50KHt9KTtcblxuaW50ZXJmYWNlIFVwZGF0ZUFwcG9pbnRtZW50UmVxdWVzdCB7XG4gIHN0YXR1cz86IEFwcG9pbnRtZW50U3RhdHVzO1xuICBzY2hlZHVsZWRUaW1lPzogc3RyaW5nO1xuICBkdXJhdGlvbj86IG51bWJlcjtcbiAgbG9jYXRpb24/OiBzdHJpbmc7XG4gIG5vdGVzPzogc3RyaW5nO1xuICBwcmVwYXJhdGlvbkluc3RydWN0aW9ucz86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnVXBkYXRlIGFwcG9pbnRtZW50IHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpKTtcblxuICAgIC8vIEdldCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBjb25zdCBhcHBvaW50bWVudElkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmFwcG9pbnRtZW50SWQ7XG5cbiAgICBpZiAoIXVzZXJJZCB8fCAhYXBwb2ludG1lbnRJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGFuZCBhcHBvaW50bWVudElkIGFyZSByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdDogVXBkYXRlQXBwb2ludG1lbnRSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHN0YXR1cyBpZiBwcm92aWRlZFxuICAgIGlmIChyZXF1ZXN0LnN0YXR1cykge1xuICAgICAgY29uc3QgdmFsaWRTdGF0dXNlczogQXBwb2ludG1lbnRTdGF0dXNbXSA9IFsnc2NoZWR1bGVkJywgJ2NvbmZpcm1lZCcsICdjb21wbGV0ZWQnLCAnY2FuY2VsbGVkJywgJ21pc3NlZCddO1xuICAgICAgaWYgKCF2YWxpZFN0YXR1c2VzLmluY2x1ZGVzKHJlcXVlc3Quc3RhdHVzKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGFwcG9pbnRtZW50IHN0YXR1cycpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHNjaGVkdWxlZFRpbWUgaWYgcHJvdmlkZWRcbiAgICBsZXQgc2NoZWR1bGVkVGltZTogRGF0ZSB8IHVuZGVmaW5lZDtcbiAgICBpZiAocmVxdWVzdC5zY2hlZHVsZWRUaW1lKSB7XG4gICAgICBzY2hlZHVsZWRUaW1lID0gbmV3IERhdGUocmVxdWVzdC5zY2hlZHVsZWRUaW1lKTtcbiAgICAgIGlmIChpc05hTihzY2hlZHVsZWRUaW1lLmdldFRpbWUoKSkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnSW52YWxpZCBzY2hlZHVsZWRUaW1lIGZvcm1hdCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ1aWxkIHVwZGF0ZXMgb2JqZWN0XG4gICAgY29uc3QgdXBkYXRlczogYW55ID0ge307XG4gICAgaWYgKHJlcXVlc3Quc3RhdHVzKSB1cGRhdGVzLnN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xuICAgIGlmIChzY2hlZHVsZWRUaW1lKSB1cGRhdGVzLnNjaGVkdWxlZFRpbWUgPSBzY2hlZHVsZWRUaW1lO1xuICAgIGlmIChyZXF1ZXN0LmR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHVwZGF0ZXMuZHVyYXRpb24gPSByZXF1ZXN0LmR1cmF0aW9uO1xuICAgIGlmIChyZXF1ZXN0LmxvY2F0aW9uICE9PSB1bmRlZmluZWQpIHVwZGF0ZXMubG9jYXRpb24gPSByZXF1ZXN0LmxvY2F0aW9uO1xuICAgIGlmIChyZXF1ZXN0Lm5vdGVzICE9PSB1bmRlZmluZWQpIHVwZGF0ZXMubm90ZXMgPSByZXF1ZXN0Lm5vdGVzO1xuICAgIGlmIChyZXF1ZXN0LnByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHVwZGF0ZXMucHJlcGFyYXRpb25JbnN0cnVjdGlvbnMgPSByZXF1ZXN0LnByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBhcHBvaW50bWVudFxuICAgIGF3YWl0IHVwZGF0ZUFwcG9pbnRtZW50KHVzZXJJZCwgYXBwb2ludG1lbnRJZCwgdXBkYXRlcyk7XG5cbiAgICBjb25zb2xlLmxvZygnQXBwb2ludG1lbnQgdXBkYXRlZDonLCBhcHBvaW50bWVudElkKTtcblxuICAgIC8vIFB1Ymxpc2ggZXZlbnQgaWYgc3RhdHVzIGNoYW5nZWRcbiAgICBpZiAocmVxdWVzdC5zdGF0dXMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGFwcG9pbnRtZW50ID0gYXdhaXQgZ2V0QXBwb2ludG1lbnQodXNlcklkLCBhcHBvaW50bWVudElkKTtcbiAgICAgICAgYXdhaXQgZXZlbnRCcmlkZ2VDbGllbnQuc2VuZChuZXcgUHV0RXZlbnRzQ29tbWFuZCh7XG4gICAgICAgICAgRW50cmllczogW3tcbiAgICAgICAgICAgIFNvdXJjZTogJ2hlYWx0aGNhcmUuYXBwb2ludG1lbnRzJyxcbiAgICAgICAgICAgIERldGFpbFR5cGU6ICdBcHBvaW50bWVudFN0YXR1c0NoYW5nZWQnLFxuICAgICAgICAgICAgRGV0YWlsOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIGFwcG9pbnRtZW50SWQsXG4gICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgc3RhdHVzOiByZXF1ZXN0LnN0YXR1cyxcbiAgICAgICAgICAgICAgc2NoZWR1bGVkVGltZTogYXBwb2ludG1lbnQ/LnNjaGVkdWxlZFRpbWUudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgRXZlbnRCdXNOYW1lOiBwcm9jZXNzLmVudi5FVkVOVF9CVVNfTkFNRSB8fCAnaGVhbHRoY2FyZS1ldmVudHMtZGV2JyxcbiAgICAgICAgICB9XSxcbiAgICAgICAgfSkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHVibGlzaGluZyBBcHBvaW50bWVudFN0YXR1c0NoYW5nZWQgZXZlbnQ6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0FwcG9pbnRtZW50IHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBhcHBvaW50bWVudDonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIHVwZGF0ZSBhcHBvaW50bWVudCcpO1xuICB9XG59XG4iXX0=