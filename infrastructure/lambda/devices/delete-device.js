"use strict";
// Delete Device Lambda Function
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_iot_1 = require("@aws-sdk/client-iot");
const types_1 = require("../shared/types");
const devices_1 = require("../shared/data-access/devices");
const iotClient = new client_iot_1.IoTClient({});
const IOT_POLICY_NAME = process.env.IOT_POLICY_NAME;
async function handler(event) {
    console.log('Delete device request:', JSON.stringify(event, null, 2));
    try {
        const deviceId = event.pathParameters?.deviceId;
        if (!deviceId) {
            return (0, types_1.createErrorResponse)(400, 'Device ID is required');
        }
        // Check if device exists
        const device = await (0, devices_1.getDevice)(deviceId);
        if (!device) {
            return (0, types_1.createErrorResponse)(404, 'Device not found');
        }
        const thingName = `healthcare-device-${deviceId}`;
        try {
            // List thing principals (certificates)
            const listPrincipalsCommand = new client_iot_1.ListThingPrincipalsCommand({
                thingName,
            });
            const principals = await iotClient.send(listPrincipalsCommand);
            // Detach and delete each certificate
            if (principals.principals && principals.principals.length > 0) {
                for (const principal of principals.principals) {
                    // Detach certificate from thing
                    const detachThingCommand = new client_iot_1.DetachThingPrincipalCommand({
                        thingName,
                        principal,
                    });
                    await iotClient.send(detachThingCommand);
                    // Detach policy from certificate
                    const detachPolicyCommand = new client_iot_1.DetachPolicyCommand({
                        policyName: IOT_POLICY_NAME,
                        target: principal,
                    });
                    await iotClient.send(detachPolicyCommand);
                    // Deactivate certificate
                    const certificateId = principal.split('/').pop();
                    if (certificateId) {
                        const updateCertCommand = new client_iot_1.UpdateCertificateCommand({
                            certificateId,
                            newStatus: 'INACTIVE',
                        });
                        await iotClient.send(updateCertCommand);
                        // Delete certificate
                        const deleteCertCommand = new client_iot_1.DeleteCertificateCommand({
                            certificateId,
                        });
                        await iotClient.send(deleteCertCommand);
                    }
                }
            }
            // Delete IoT Thing
            const deleteThingCommand = new client_iot_1.DeleteThingCommand({
                thingName,
            });
            await iotClient.send(deleteThingCommand);
            console.log(`Deleted IoT Thing: ${thingName}`);
        }
        catch (iotError) {
            console.warn('Error cleaning up IoT resources:', iotError);
            // Continue with database deletion even if IoT cleanup fails
        }
        // Delete device from DynamoDB
        await (0, devices_1.deleteDevice)(deviceId);
        console.log(`Deleted device from database: ${deviceId}`);
        return (0, types_1.createSuccessResponse)({ message: 'Device deleted successfully', deviceId });
    }
    catch (error) {
        console.error('Error deleting device:', error);
        return (0, types_1.createErrorResponse)(500, `Failed to delete device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLWRldmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlbGV0ZS1kZXZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGdDQUFnQztBQUNoQyxvQkFBb0I7O0FBVXBCLDBCQWlGQztBQXhGRCxvREFBc007QUFDdE0sMkNBQTZFO0FBQzdFLDJEQUF3RjtBQUV4RixNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFnQixDQUFDO0FBRTlDLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0RSxJQUFJLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQztRQUVoRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsbUJBQVMsRUFBQyxRQUFRLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLHFCQUFxQixRQUFRLEVBQUUsQ0FBQztRQUVsRCxJQUFJLENBQUM7WUFDSCx1Q0FBdUM7WUFDdkMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLHVDQUEwQixDQUFDO2dCQUMzRCxTQUFTO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxVQUFVLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFFL0QscUNBQXFDO1lBQ3JDLElBQUksVUFBVSxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzlDLGdDQUFnQztvQkFDaEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdDQUEyQixDQUFDO3dCQUN6RCxTQUFTO3dCQUNULFNBQVM7cUJBQ1YsQ0FBQyxDQUFDO29CQUNILE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUV6QyxpQ0FBaUM7b0JBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxnQ0FBbUIsQ0FBQzt3QkFDbEQsVUFBVSxFQUFFLGVBQWU7d0JBQzNCLE1BQU0sRUFBRSxTQUFTO3FCQUNsQixDQUFDLENBQUM7b0JBQ0gsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBRTFDLHlCQUF5QjtvQkFDekIsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDakQsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDbEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHFDQUF3QixDQUFDOzRCQUNyRCxhQUFhOzRCQUNiLFNBQVMsRUFBRSxVQUFVO3lCQUN0QixDQUFDLENBQUM7d0JBQ0gsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7d0JBRXhDLHFCQUFxQjt3QkFDckIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHFDQUF3QixDQUFDOzRCQUNyRCxhQUFhO3lCQUNkLENBQUMsQ0FBQzt3QkFDSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDMUMsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztZQUVELG1CQUFtQjtZQUNuQixNQUFNLGtCQUFrQixHQUFHLElBQUksK0JBQWtCLENBQUM7Z0JBQ2hELFNBQVM7YUFDVixDQUFDLENBQUM7WUFDSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFBQyxPQUFPLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0QsNERBQTREO1FBQzlELENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxJQUFBLHNCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUV6RCxPQUFPLElBQUEsNkJBQXFCLEVBQUMsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0QkFBNEIsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUMxSCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIERlbGV0ZSBEZXZpY2UgTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDcuMlxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBJb1RDbGllbnQsIERlbGV0ZVRoaW5nQ29tbWFuZCwgRGV0YWNoVGhpbmdQcmluY2lwYWxDb21tYW5kLCBMaXN0VGhpbmdQcmluY2lwYWxzQ29tbWFuZCwgVXBkYXRlQ2VydGlmaWNhdGVDb21tYW5kLCBEZXRhY2hQb2xpY3lDb21tYW5kLCBEZWxldGVDZXJ0aWZpY2F0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtaW90JztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBnZXREZXZpY2UsIGRlbGV0ZURldmljZSBhcyByZW1vdmVEZXZpY2UgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvZGV2aWNlcyc7XG5cbmNvbnN0IGlvdENsaWVudCA9IG5ldyBJb1RDbGllbnQoe30pO1xuY29uc3QgSU9UX1BPTElDWV9OQU1FID0gcHJvY2Vzcy5lbnYuSU9UX1BPTElDWV9OQU1FITtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgY29uc29sZS5sb2coJ0RlbGV0ZSBkZXZpY2UgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZGV2aWNlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZGV2aWNlSWQ7XG5cbiAgICBpZiAoIWRldmljZUlkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdEZXZpY2UgSUQgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBkZXZpY2UgZXhpc3RzXG4gICAgY29uc3QgZGV2aWNlID0gYXdhaXQgZ2V0RGV2aWNlKGRldmljZUlkKTtcbiAgICBpZiAoIWRldmljZSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnRGV2aWNlIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHRoaW5nTmFtZSA9IGBoZWFsdGhjYXJlLWRldmljZS0ke2RldmljZUlkfWA7XG5cbiAgICB0cnkge1xuICAgICAgLy8gTGlzdCB0aGluZyBwcmluY2lwYWxzIChjZXJ0aWZpY2F0ZXMpXG4gICAgICBjb25zdCBsaXN0UHJpbmNpcGFsc0NvbW1hbmQgPSBuZXcgTGlzdFRoaW5nUHJpbmNpcGFsc0NvbW1hbmQoe1xuICAgICAgICB0aGluZ05hbWUsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJpbmNpcGFscyA9IGF3YWl0IGlvdENsaWVudC5zZW5kKGxpc3RQcmluY2lwYWxzQ29tbWFuZCk7XG5cbiAgICAgIC8vIERldGFjaCBhbmQgZGVsZXRlIGVhY2ggY2VydGlmaWNhdGVcbiAgICAgIGlmIChwcmluY2lwYWxzLnByaW5jaXBhbHMgJiYgcHJpbmNpcGFscy5wcmluY2lwYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChjb25zdCBwcmluY2lwYWwgb2YgcHJpbmNpcGFscy5wcmluY2lwYWxzKSB7XG4gICAgICAgICAgLy8gRGV0YWNoIGNlcnRpZmljYXRlIGZyb20gdGhpbmdcbiAgICAgICAgICBjb25zdCBkZXRhY2hUaGluZ0NvbW1hbmQgPSBuZXcgRGV0YWNoVGhpbmdQcmluY2lwYWxDb21tYW5kKHtcbiAgICAgICAgICAgIHRoaW5nTmFtZSxcbiAgICAgICAgICAgIHByaW5jaXBhbCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBhd2FpdCBpb3RDbGllbnQuc2VuZChkZXRhY2hUaGluZ0NvbW1hbmQpO1xuXG4gICAgICAgICAgLy8gRGV0YWNoIHBvbGljeSBmcm9tIGNlcnRpZmljYXRlXG4gICAgICAgICAgY29uc3QgZGV0YWNoUG9saWN5Q29tbWFuZCA9IG5ldyBEZXRhY2hQb2xpY3lDb21tYW5kKHtcbiAgICAgICAgICAgIHBvbGljeU5hbWU6IElPVF9QT0xJQ1lfTkFNRSxcbiAgICAgICAgICAgIHRhcmdldDogcHJpbmNpcGFsLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGF3YWl0IGlvdENsaWVudC5zZW5kKGRldGFjaFBvbGljeUNvbW1hbmQpO1xuXG4gICAgICAgICAgLy8gRGVhY3RpdmF0ZSBjZXJ0aWZpY2F0ZVxuICAgICAgICAgIGNvbnN0IGNlcnRpZmljYXRlSWQgPSBwcmluY2lwYWwuc3BsaXQoJy8nKS5wb3AoKTtcbiAgICAgICAgICBpZiAoY2VydGlmaWNhdGVJZCkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlQ2VydENvbW1hbmQgPSBuZXcgVXBkYXRlQ2VydGlmaWNhdGVDb21tYW5kKHtcbiAgICAgICAgICAgICAgY2VydGlmaWNhdGVJZCxcbiAgICAgICAgICAgICAgbmV3U3RhdHVzOiAnSU5BQ1RJVkUnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBpb3RDbGllbnQuc2VuZCh1cGRhdGVDZXJ0Q29tbWFuZCk7XG5cbiAgICAgICAgICAgIC8vIERlbGV0ZSBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgY29uc3QgZGVsZXRlQ2VydENvbW1hbmQgPSBuZXcgRGVsZXRlQ2VydGlmaWNhdGVDb21tYW5kKHtcbiAgICAgICAgICAgICAgY2VydGlmaWNhdGVJZCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgaW90Q2xpZW50LnNlbmQoZGVsZXRlQ2VydENvbW1hbmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBEZWxldGUgSW9UIFRoaW5nXG4gICAgICBjb25zdCBkZWxldGVUaGluZ0NvbW1hbmQgPSBuZXcgRGVsZXRlVGhpbmdDb21tYW5kKHtcbiAgICAgICAgdGhpbmdOYW1lLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCBpb3RDbGllbnQuc2VuZChkZWxldGVUaGluZ0NvbW1hbmQpO1xuICAgICAgY29uc29sZS5sb2coYERlbGV0ZWQgSW9UIFRoaW5nOiAke3RoaW5nTmFtZX1gKTtcbiAgICB9IGNhdGNoIChpb3RFcnJvcikge1xuICAgICAgY29uc29sZS53YXJuKCdFcnJvciBjbGVhbmluZyB1cCBJb1QgcmVzb3VyY2VzOicsIGlvdEVycm9yKTtcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggZGF0YWJhc2UgZGVsZXRpb24gZXZlbiBpZiBJb1QgY2xlYW51cCBmYWlsc1xuICAgIH1cblxuICAgIC8vIERlbGV0ZSBkZXZpY2UgZnJvbSBEeW5hbW9EQlxuICAgIGF3YWl0IHJlbW92ZURldmljZShkZXZpY2VJZCk7XG4gICAgY29uc29sZS5sb2coYERlbGV0ZWQgZGV2aWNlIGZyb20gZGF0YWJhc2U6ICR7ZGV2aWNlSWR9YCk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHsgbWVzc2FnZTogJ0RldmljZSBkZWxldGVkIHN1Y2Nlc3NmdWxseScsIGRldmljZUlkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlbGV0aW5nIGRldmljZTonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCBgRmFpbGVkIHRvIGRlbGV0ZSBkZXZpY2U6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gIH1cbn1cbiJdfQ==