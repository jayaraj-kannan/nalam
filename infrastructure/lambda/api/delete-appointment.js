"use strict";
// Delete Appointment Lambda Function
// Requirements: 6.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const types_1 = require("../shared/types");
async function handler(event) {
    try {
        console.log('Delete appointment request:', JSON.stringify(event));
        // Get parameters
        const userId = event.pathParameters?.userId;
        const appointmentId = event.pathParameters?.appointmentId;
        if (!userId || !appointmentId) {
            return (0, types_1.createErrorResponse)(400, 'userId and appointmentId are required');
        }
        // Delete appointment
        await (0, appointments_1.deleteAppointment)(userId, appointmentId);
        console.log('Appointment deleted:', appointmentId);
        return (0, types_1.createSuccessResponse)({
            message: 'Appointment deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting appointment:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to delete appointment');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLWFwcG9pbnRtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVsZXRlLWFwcG9pbnRtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsb0JBQW9COztBQU1wQiwwQkF3QkM7QUEzQkQscUVBQXVFO0FBQ3ZFLDJDQUE2RTtBQUV0RSxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWxFLGlCQUFpQjtRQUNqQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUM1QyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztRQUUxRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxJQUFBLGdDQUFpQixFQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUUvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRW5ELE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixPQUFPLEVBQUUsa0NBQWtDO1NBQzVDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDhCQUE4QixDQUFDLENBQUM7SUFDbEUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBEZWxldGUgQXBwb2ludG1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDYuNVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBkZWxldGVBcHBvaW50bWVudCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnRGVsZXRlIGFwcG9pbnRtZW50IHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpKTtcblxuICAgIC8vIEdldCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBjb25zdCBhcHBvaW50bWVudElkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmFwcG9pbnRtZW50SWQ7XG5cbiAgICBpZiAoIXVzZXJJZCB8fCAhYXBwb2ludG1lbnRJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGFuZCBhcHBvaW50bWVudElkIGFyZSByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIC8vIERlbGV0ZSBhcHBvaW50bWVudFxuICAgIGF3YWl0IGRlbGV0ZUFwcG9pbnRtZW50KHVzZXJJZCwgYXBwb2ludG1lbnRJZCk7XG5cbiAgICBjb25zb2xlLmxvZygnQXBwb2ludG1lbnQgZGVsZXRlZDonLCBhcHBvaW50bWVudElkKTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0FwcG9pbnRtZW50IGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZWxldGluZyBhcHBvaW50bWVudDonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGRlbGV0ZSBhcHBvaW50bWVudCcpO1xuICB9XG59XG4iXX0=