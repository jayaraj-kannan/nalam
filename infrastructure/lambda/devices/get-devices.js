"use strict";
// Get Devices Lambda Function
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const devices_1 = require("../shared/data-access/devices");
async function handler(event) {
    console.log('Get devices request:', JSON.stringify(event, null, 2));
    try {
        const deviceId = event.pathParameters?.deviceId;
        const userId = event.queryStringParameters?.userId;
        // Get specific device by ID
        if (deviceId) {
            const device = await (0, devices_1.getDevice)(deviceId);
            if (!device) {
                return (0, types_1.createErrorResponse)(404, 'Device not found');
            }
            return (0, types_1.createSuccessResponse)(device);
        }
        // Get all devices for a user
        if (userId) {
            const devices = await (0, devices_1.getDevicesByUser)(userId);
            return (0, types_1.createSuccessResponse)({ devices, count: devices.length });
        }
        return (0, types_1.createErrorResponse)(400, 'Either deviceId or userId parameter is required');
    }
    catch (error) {
        console.error('Error getting devices:', error);
        return (0, types_1.createErrorResponse)(500, `Failed to get devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWRldmljZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtZGV2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsOEJBQThCO0FBQzlCLG9CQUFvQjs7QUFNcEIsMEJBNkJDO0FBaENELDJDQUE2RTtBQUM3RSwyREFBNEU7QUFFckUsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBFLElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUM7UUFFbkQsNEJBQTRCO1FBQzVCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsbUJBQVMsRUFBQyxRQUFRLENBQUMsQ0FBQztZQUV6QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3RELENBQUM7WUFFRCxPQUFPLElBQUEsNkJBQXFCLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1gsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLDBCQUFnQixFQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLE9BQU8sSUFBQSw2QkFBcUIsRUFBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsaURBQWlELENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwwQkFBMEIsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUN4SCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEdldCBEZXZpY2VzIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA3LjJcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGdldERldmljZSwgZ2V0RGV2aWNlc0J5VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9kZXZpY2VzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgY29uc29sZS5sb2coJ0dldCBkZXZpY2VzIHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcblxuICB0cnkge1xuICAgIGNvbnN0IGRldmljZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmRldmljZUlkO1xuICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8udXNlcklkO1xuXG4gICAgLy8gR2V0IHNwZWNpZmljIGRldmljZSBieSBJRFxuICAgIGlmIChkZXZpY2VJZCkge1xuICAgICAgY29uc3QgZGV2aWNlID0gYXdhaXQgZ2V0RGV2aWNlKGRldmljZUlkKTtcbiAgICAgIFxuICAgICAgaWYgKCFkZXZpY2UpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnRGV2aWNlIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKGRldmljZSk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGFsbCBkZXZpY2VzIGZvciBhIHVzZXJcbiAgICBpZiAodXNlcklkKSB7XG4gICAgICBjb25zdCBkZXZpY2VzID0gYXdhaXQgZ2V0RGV2aWNlc0J5VXNlcih1c2VySWQpO1xuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7IGRldmljZXMsIGNvdW50OiBkZXZpY2VzLmxlbmd0aCB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdFaXRoZXIgZGV2aWNlSWQgb3IgdXNlcklkIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZGV2aWNlczonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCBgRmFpbGVkIHRvIGdldCBkZXZpY2VzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICB9XG59XG4iXX0=