"use strict";
// Get Care Circle Lambda Function
// Requirements: 4.1, 4.5
// Retrieves care circle members and their permissions for a primary user
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
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
        // Check if requesting user is the primary user or a care circle member
        if (requestingUserId !== userId) {
            const member = await (0, care_circle_1.getCareCircleMembers)(userId);
            const isMember = member.some(m => m.secondaryUserId === requestingUserId);
            if (!isMember) {
                return (0, types_1.createErrorResponse)(403, 'You do not have permission to view this care circle');
            }
        }
        // Get care circle members
        const relationships = await (0, care_circle_1.getCareCircleMembers)(userId);
        // Enrich with user profile information
        const members = await Promise.all(relationships.map(async (rel) => {
            const user = await (0, users_1.getUser)(rel.secondaryUserId);
            return {
                userId: rel.secondaryUserId,
                profile: user?.profile || {
                    firstName: 'Unknown',
                    lastName: 'User',
                    email: '',
                    phone: '',
                    dateOfBirth: '',
                },
                relationship: rel.relationship,
                permissions: rel.permissions,
                joinedAt: new Date(rel.joinedAt),
                lastActive: new Date(rel.lastActive),
            };
        }));
        return (0, types_1.createSuccessResponse)({
            primaryUserId: userId,
            members,
            memberCount: members.length,
        });
    }
    catch (error) {
        console.error('Error getting care circle:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to retrieve care circle');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWNhcmUtY2lyY2xlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWNhcmUtY2lyY2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMseUJBQXlCO0FBQ3pCLHlFQUF5RTs7QUFPekUsMEJBeURDO0FBN0RELDJDQUErRjtBQUMvRixtRUFBeUU7QUFDekUsdURBQXNEO0FBRS9DLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsa0NBQWtDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsOENBQThDO1FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCx1RUFBdUU7UUFDdkUsSUFBSSxnQkFBZ0IsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsa0NBQW9CLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEtBQUssZ0JBQWdCLENBQUMsQ0FBQztZQUUxRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxxREFBcUQsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7UUFDSCxDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBQSxrQ0FBb0IsRUFBQyxNQUFNLENBQUMsQ0FBQztRQUV6RCx1Q0FBdUM7UUFDdkMsTUFBTSxPQUFPLEdBQXVCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDbkQsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLGVBQU8sRUFBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDaEQsT0FBTztnQkFDTCxNQUFNLEVBQUUsR0FBRyxDQUFDLGVBQWU7Z0JBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxJQUFJO29CQUN4QixTQUFTLEVBQUUsU0FBUztvQkFDcEIsUUFBUSxFQUFFLE1BQU07b0JBQ2hCLEtBQUssRUFBRSxFQUFFO29CQUNULEtBQUssRUFBRSxFQUFFO29CQUNULFdBQVcsRUFBRSxFQUFFO2lCQUNoQjtnQkFDRCxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVk7Z0JBQzlCLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVztnQkFDNUIsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO2FBQ3JDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FDSCxDQUFDO1FBRUYsT0FBTyxJQUFBLDZCQUFxQixFQUFDO1lBQzNCLGFBQWEsRUFBRSxNQUFNO1lBQ3JCLE9BQU87WUFDUCxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU07U0FDNUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEdldCBDYXJlIENpcmNsZSBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNC4xLCA0LjVcbi8vIFJldHJpZXZlcyBjYXJlIGNpcmNsZSBtZW1iZXJzIGFuZCB0aGVpciBwZXJtaXNzaW9ucyBmb3IgYSBwcmltYXJ5IHVzZXJcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBDYXJlQ2lyY2xlTWVtYmVyIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXJzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGdldFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIC8vIEdldCB1c2VySWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCB1c2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIGlmICghdXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICd1c2VySWQgaXMgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiByZXF1ZXN0aW5nIHVzZXIgaXMgdGhlIHByaW1hcnkgdXNlciBvciBhIGNhcmUgY2lyY2xlIG1lbWJlclxuICAgIGlmIChyZXF1ZXN0aW5nVXNlcklkICE9PSB1c2VySWQpIHtcbiAgICAgIGNvbnN0IG1lbWJlciA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHVzZXJJZCk7XG4gICAgICBjb25zdCBpc01lbWJlciA9IG1lbWJlci5zb21lKG0gPT4gbS5zZWNvbmRhcnlVc2VySWQgPT09IHJlcXVlc3RpbmdVc2VySWQpO1xuICAgICAgXG4gICAgICBpZiAoIWlzTWVtYmVyKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIHZpZXcgdGhpcyBjYXJlIGNpcmNsZScpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdldCBjYXJlIGNpcmNsZSBtZW1iZXJzXG4gICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHVzZXJJZCk7XG5cbiAgICAvLyBFbnJpY2ggd2l0aCB1c2VyIHByb2ZpbGUgaW5mb3JtYXRpb25cbiAgICBjb25zdCBtZW1iZXJzOiBDYXJlQ2lyY2xlTWVtYmVyW10gPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIHJlbGF0aW9uc2hpcHMubWFwKGFzeW5jIChyZWwpID0+IHtcbiAgICAgICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXIocmVsLnNlY29uZGFyeVVzZXJJZCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdXNlcklkOiByZWwuc2Vjb25kYXJ5VXNlcklkLFxuICAgICAgICAgIHByb2ZpbGU6IHVzZXI/LnByb2ZpbGUgfHwge1xuICAgICAgICAgICAgZmlyc3ROYW1lOiAnVW5rbm93bicsXG4gICAgICAgICAgICBsYXN0TmFtZTogJ1VzZXInLFxuICAgICAgICAgICAgZW1haWw6ICcnLFxuICAgICAgICAgICAgcGhvbmU6ICcnLFxuICAgICAgICAgICAgZGF0ZU9mQmlydGg6ICcnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVsYXRpb25zaGlwOiByZWwucmVsYXRpb25zaGlwLFxuICAgICAgICAgIHBlcm1pc3Npb25zOiByZWwucGVybWlzc2lvbnMsXG4gICAgICAgICAgam9pbmVkQXQ6IG5ldyBEYXRlKHJlbC5qb2luZWRBdCksXG4gICAgICAgICAgbGFzdEFjdGl2ZTogbmV3IERhdGUocmVsLmxhc3RBY3RpdmUpLFxuICAgICAgICB9O1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBwcmltYXJ5VXNlcklkOiB1c2VySWQsXG4gICAgICBtZW1iZXJzLFxuICAgICAgbWVtYmVyQ291bnQ6IG1lbWJlcnMubGVuZ3RoLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgY2FyZSBjaXJjbGU6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZXRyaWV2ZSBjYXJlIGNpcmNsZScpO1xuICB9XG59XG4iXX0=