"use strict";
// Get Appointments Lambda Function
// Requirements: 6.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const types_1 = require("../shared/types");
async function handler(event) {
    try {
        console.log('Get appointments request:', JSON.stringify(event));
        // Get userId from path parameters
        const userId = event.pathParameters?.userId;
        if (!userId) {
            return (0, types_1.createErrorResponse)(400, 'userId is required');
        }
        // Get query parameters
        const queryParams = event.queryStringParameters || {};
        const upcoming = queryParams.upcoming === 'true';
        const startTime = queryParams.startTime ? new Date(queryParams.startTime) : undefined;
        const endTime = queryParams.endTime ? new Date(queryParams.endTime) : undefined;
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;
        let appointments;
        if (upcoming) {
            // Get upcoming appointments
            const now = startTime || new Date();
            appointments = await (0, appointments_1.getUpcomingAppointments)(userId, now, endTime, limit);
        }
        else {
            // Get all appointments for user
            appointments = await (0, appointments_1.getAppointmentsByUser)(userId, limit);
        }
        return (0, types_1.createSuccessResponse)({
            appointments,
            count: appointments.length,
        });
    }
    catch (error) {
        console.error('Error getting appointments:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to get appointments');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFwcG9pbnRtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1hcHBvaW50bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUFtQztBQUNuQyxvQkFBb0I7O0FBTXBCLDBCQW9DQztBQXZDRCxxRUFBb0c7QUFDcEcsMkNBQTZFO0FBRXRFLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFaEUsa0NBQWtDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUM7UUFDakQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDdEYsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDaEYsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUU5RSxJQUFJLFlBQVksQ0FBQztRQUVqQixJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2IsNEJBQTRCO1lBQzVCLE1BQU0sR0FBRyxHQUFHLFNBQVMsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3BDLFlBQVksR0FBRyxNQUFNLElBQUEsc0NBQXVCLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUUsQ0FBQzthQUFNLENBQUM7WUFDTixnQ0FBZ0M7WUFDaEMsWUFBWSxHQUFHLE1BQU0sSUFBQSxvQ0FBcUIsRUFBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixZQUFZO1lBQ1osS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDaEUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBHZXQgQXBwb2ludG1lbnRzIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA2LjVcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZ2V0QXBwb2ludG1lbnRzQnlVc2VyLCBnZXRVcGNvbWluZ0FwcG9pbnRtZW50cyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnR2V0IGFwcG9pbnRtZW50cyByZXF1ZXN0OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSk7XG5cbiAgICAvLyBHZXQgdXNlcklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcbiAgICBjb25zdCB1cGNvbWluZyA9IHF1ZXJ5UGFyYW1zLnVwY29taW5nID09PSAndHJ1ZSc7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gcXVlcnlQYXJhbXMuc3RhcnRUaW1lID8gbmV3IERhdGUocXVlcnlQYXJhbXMuc3RhcnRUaW1lKSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBlbmRUaW1lID0gcXVlcnlQYXJhbXMuZW5kVGltZSA/IG5ldyBEYXRlKHF1ZXJ5UGFyYW1zLmVuZFRpbWUpIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IGxpbWl0ID0gcXVlcnlQYXJhbXMubGltaXQgPyBwYXJzZUludChxdWVyeVBhcmFtcy5saW1pdCwgMTApIDogdW5kZWZpbmVkO1xuXG4gICAgbGV0IGFwcG9pbnRtZW50cztcblxuICAgIGlmICh1cGNvbWluZykge1xuICAgICAgLy8gR2V0IHVwY29taW5nIGFwcG9pbnRtZW50c1xuICAgICAgY29uc3Qgbm93ID0gc3RhcnRUaW1lIHx8IG5ldyBEYXRlKCk7XG4gICAgICBhcHBvaW50bWVudHMgPSBhd2FpdCBnZXRVcGNvbWluZ0FwcG9pbnRtZW50cyh1c2VySWQsIG5vdywgZW5kVGltZSwgbGltaXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBHZXQgYWxsIGFwcG9pbnRtZW50cyBmb3IgdXNlclxuICAgICAgYXBwb2ludG1lbnRzID0gYXdhaXQgZ2V0QXBwb2ludG1lbnRzQnlVc2VyKHVzZXJJZCwgbGltaXQpO1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgYXBwb2ludG1lbnRzLFxuICAgICAgY291bnQ6IGFwcG9pbnRtZW50cy5sZW5ndGgsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBhcHBvaW50bWVudHM6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBnZXQgYXBwb2ludG1lbnRzJyk7XG4gIH1cbn1cbiJdfQ==