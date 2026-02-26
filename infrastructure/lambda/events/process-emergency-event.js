"use strict";
// Process Emergency Event Handler
// Requirements: 3.1, 3.2, 3.3, 3.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
async function handler(event) {
    try {
        const emergencyDetail = event.detail;
        console.log('Processing emergency event:', {
            emergencyId: emergencyDetail.emergencyId,
            userId: emergencyDetail.userId,
            type: emergencyDetail.type,
            severity: emergencyDetail.severity,
        });
        // This handler processes the emergency event and coordinates with notification service
        // The actual notification delivery is handled by the notification service (task 6.5)
        // For critical emergencies, ensure escalation to emergency services
        if (emergencyDetail.severity === 'critical') {
            console.log('Critical emergency detected - escalating to emergency services');
            // Log emergency information that would be provided to emergency services
            console.log('Emergency information for services:', {
                patient: emergencyDetail.userName,
                location: emergencyDetail.location,
                medicalHistory: emergencyDetail.medicalHistory,
                symptoms: emergencyDetail.symptoms,
            });
        }
        // For missed check-ins that exceed 24 hours, escalate to emergency contacts
        if (emergencyDetail.type === 'missed_check_in') {
            console.log('Missed check-in detected - escalating to emergency contacts');
        }
        // Log successful processing
        console.log('Emergency event processed successfully:', emergencyDetail.emergencyId);
    }
    catch (error) {
        console.error('Error processing emergency event:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1lbWVyZ2VuY3ktZXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9jZXNzLWVtZXJnZW5jeS1ldmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLG1DQUFtQzs7QUF5Qm5DLDBCQXNDQztBQXRDTSxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQW1FO0lBQy9GLElBQUksQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFFckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRTtZQUN6QyxXQUFXLEVBQUUsZUFBZSxDQUFDLFdBQVc7WUFDeEMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxNQUFNO1lBQzlCLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSTtZQUMxQixRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsdUZBQXVGO1FBQ3ZGLHFGQUFxRjtRQUVyRixvRUFBb0U7UUFDcEUsSUFBSSxlQUFlLENBQUMsUUFBUSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztZQUU5RSx5RUFBeUU7WUFDekUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsRUFBRTtnQkFDakQsT0FBTyxFQUFFLGVBQWUsQ0FBQyxRQUFRO2dCQUNqQyxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7Z0JBQ2xDLGNBQWMsRUFBRSxlQUFlLENBQUMsY0FBYztnQkFDOUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRO2FBQ25DLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCw0RUFBNEU7UUFDNUUsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsRUFBRSxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9jZXNzIEVtZXJnZW5jeSBFdmVudCBIYW5kbGVyXG4vLyBSZXF1aXJlbWVudHM6IDMuMSwgMy4yLCAzLjMsIDMuNVxuXG5pbXBvcnQgeyBFdmVudEJyaWRnZUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBFbWVyZ2VuY3lUeXBlLCBFbWVyZ2VuY3lTZXZlcml0eSwgR2VvTG9jYXRpb24gfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuXG5pbnRlcmZhY2UgRW1lcmdlbmN5RXZlbnREZXRhaWwge1xuICBlbWVyZ2VuY3lJZDogc3RyaW5nO1xuICBhbGVydElkOiBzdHJpbmc7XG4gIHVzZXJJZDogc3RyaW5nO1xuICB1c2VyTmFtZTogc3RyaW5nO1xuICB0eXBlOiBFbWVyZ2VuY3lUeXBlO1xuICBzZXZlcml0eTogRW1lcmdlbmN5U2V2ZXJpdHk7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICBsb2NhdGlvbj86IEdlb0xvY2F0aW9uO1xuICBzeW1wdG9tcz86IHN0cmluZ1tdO1xuICBtZWRpY2FsSGlzdG9yeT86IHtcbiAgICBjb25kaXRpb25zOiB1bmtub3duW107XG4gICAgbWVkaWNhdGlvbnM6IHVua25vd25bXTtcbiAgICBhbGxlcmdpZXM6IHN0cmluZ1tdO1xuICAgIGVtZXJnZW5jeUNvbnRhY3RzOiB1bmtub3duW107XG4gICAgaGVhbHRoY2FyZVByb3ZpZGVyczogdW5rbm93bltdO1xuICB9O1xuICByZXNwb25kZXJzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEV2ZW50QnJpZGdlRXZlbnQ8J0VtZXJnZW5jeVRyaWdnZXJlZCcsIEVtZXJnZW5jeUV2ZW50RGV0YWlsPik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IGVtZXJnZW5jeURldGFpbCA9IGV2ZW50LmRldGFpbDtcblxuICAgIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIGVtZXJnZW5jeSBldmVudDonLCB7XG4gICAgICBlbWVyZ2VuY3lJZDogZW1lcmdlbmN5RGV0YWlsLmVtZXJnZW5jeUlkLFxuICAgICAgdXNlcklkOiBlbWVyZ2VuY3lEZXRhaWwudXNlcklkLFxuICAgICAgdHlwZTogZW1lcmdlbmN5RGV0YWlsLnR5cGUsXG4gICAgICBzZXZlcml0eTogZW1lcmdlbmN5RGV0YWlsLnNldmVyaXR5LFxuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBoYW5kbGVyIHByb2Nlc3NlcyB0aGUgZW1lcmdlbmN5IGV2ZW50IGFuZCBjb29yZGluYXRlcyB3aXRoIG5vdGlmaWNhdGlvbiBzZXJ2aWNlXG4gICAgLy8gVGhlIGFjdHVhbCBub3RpZmljYXRpb24gZGVsaXZlcnkgaXMgaGFuZGxlZCBieSB0aGUgbm90aWZpY2F0aW9uIHNlcnZpY2UgKHRhc2sgNi41KVxuICAgIFxuICAgIC8vIEZvciBjcml0aWNhbCBlbWVyZ2VuY2llcywgZW5zdXJlIGVzY2FsYXRpb24gdG8gZW1lcmdlbmN5IHNlcnZpY2VzXG4gICAgaWYgKGVtZXJnZW5jeURldGFpbC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykge1xuICAgICAgY29uc29sZS5sb2coJ0NyaXRpY2FsIGVtZXJnZW5jeSBkZXRlY3RlZCAtIGVzY2FsYXRpbmcgdG8gZW1lcmdlbmN5IHNlcnZpY2VzJyk7XG4gICAgICBcbiAgICAgIC8vIExvZyBlbWVyZ2VuY3kgaW5mb3JtYXRpb24gdGhhdCB3b3VsZCBiZSBwcm92aWRlZCB0byBlbWVyZ2VuY3kgc2VydmljZXNcbiAgICAgIGNvbnNvbGUubG9nKCdFbWVyZ2VuY3kgaW5mb3JtYXRpb24gZm9yIHNlcnZpY2VzOicsIHtcbiAgICAgICAgcGF0aWVudDogZW1lcmdlbmN5RGV0YWlsLnVzZXJOYW1lLFxuICAgICAgICBsb2NhdGlvbjogZW1lcmdlbmN5RGV0YWlsLmxvY2F0aW9uLFxuICAgICAgICBtZWRpY2FsSGlzdG9yeTogZW1lcmdlbmN5RGV0YWlsLm1lZGljYWxIaXN0b3J5LFxuICAgICAgICBzeW1wdG9tczogZW1lcmdlbmN5RGV0YWlsLnN5bXB0b21zLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRm9yIG1pc3NlZCBjaGVjay1pbnMgdGhhdCBleGNlZWQgMjQgaG91cnMsIGVzY2FsYXRlIHRvIGVtZXJnZW5jeSBjb250YWN0c1xuICAgIGlmIChlbWVyZ2VuY3lEZXRhaWwudHlwZSA9PT0gJ21pc3NlZF9jaGVja19pbicpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdNaXNzZWQgY2hlY2staW4gZGV0ZWN0ZWQgLSBlc2NhbGF0aW5nIHRvIGVtZXJnZW5jeSBjb250YWN0cycpO1xuICAgIH1cblxuICAgIC8vIExvZyBzdWNjZXNzZnVsIHByb2Nlc3NpbmdcbiAgICBjb25zb2xlLmxvZygnRW1lcmdlbmN5IGV2ZW50IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHk6JywgZW1lcmdlbmN5RGV0YWlsLmVtZXJnZW5jeUlkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGVtZXJnZW5jeSBldmVudDonLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==