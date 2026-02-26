"use strict";
// Check Medication Adherence Lambda Function
// Requirements: 2.2, 2.3, 2.5
// Triggered periodically to check for missed medications and adherence compliance
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const medications_1 = require("../shared/data-access/medications");
const alerts_1 = require("../shared/data-access/alerts");
const care_circle_1 = require("../shared/data-access/care-circle");
const notification_service_1 = require("../shared/notification-service");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
const MISSED_MEDICATION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const ADHERENCE_THRESHOLD = 80; // 80% adherence threshold
const ADHERENCE_WINDOW_DAYS = 7; // Calculate adherence over 7 days
/**
 * Get all users who have medications
 */
async function getAllUsersWithMedications() {
    const userIds = new Set();
    try {
        const result = await dynamodbClient.send(new client_dynamodb_1.ScanCommand({
            TableName: process.env.MEDICATIONS_TABLE || 'healthcare-medications-dev',
            ProjectionExpression: 'userId',
        }));
        if (result.Items) {
            result.Items.forEach(item => {
                const unmarshalled = (0, util_dynamodb_1.unmarshall)(item);
                if (unmarshalled.userId) {
                    userIds.add(unmarshalled.userId);
                }
            });
        }
    }
    catch (error) {
        console.error('Error scanning medications table:', error);
    }
    return Array.from(userIds);
}
/**
 * Check if medication is missed (30 minutes past scheduled time)
 */
function isMedicationMissed(scheduledTime, currentTime) {
    const timeDiff = currentTime.getTime() - scheduledTime.getTime();
    return timeDiff >= MISSED_MEDICATION_THRESHOLD_MS;
}
/**
 * Calculate adherence score for a user over the past week
 */
function calculateAdherenceScore(medications) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);
    // Filter medications from the past week
    const recentMedications = medications.filter(med => med.scheduledTime >= weekAgo);
    if (recentMedications.length === 0) {
        return 100; // No medications scheduled, perfect adherence
    }
    // Count taken medications
    const takenCount = recentMedications.filter(med => med.status === 'taken').length;
    // Calculate percentage
    const adherenceScore = (takenCount / recentMedications.length) * 100;
    return Math.round(adherenceScore);
}
/**
 * Mark medication as missed and notify care circle
 */
async function handleMissedMedication(userId, medication) {
    try {
        // Update medication status to missed
        await (0, medications_1.updateMedicationStatus)(userId, medication.id, 'missed');
        // Create alert for missed medication
        const alertId = await (0, alerts_1.createAlert)({
            userId,
            type: 'medication',
            severity: 'medium',
            message: `Missed medication: ${medication.medication.name} (${medication.medication.dosage}) scheduled at ${medication.scheduledTime.toLocaleTimeString()}`,
            timestamp: new Date(),
            acknowledged: false,
            escalated: false,
            relatedData: {
                medicationId: medication.id,
                medicationName: medication.medication.name,
                dosage: medication.medication.dosage,
                scheduledTime: medication.scheduledTime.toISOString(),
            },
        });
        // Get care circle members
        const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(userId);
        if (careCircleMembers.length > 0) {
            // Notify care circle
            const alert = {
                id: alertId,
                userId,
                type: 'medication',
                severity: 'medium',
                message: `${medication.medication.name} medication was missed`,
                timestamp: new Date(),
                acknowledged: false,
                escalated: false,
            };
            await (0, notification_service_1.sendNotificationToCareCircle)(careCircleMembers.map(m => m.secondaryUserId), alert, ['push', 'sms', 'email']);
        }
        console.log(`Marked medication ${medication.id} as missed for user ${userId}`);
    }
    catch (error) {
        console.error('Error handling missed medication:', error);
    }
}
/**
 * Check adherence compliance and generate alert if below threshold
 */
async function checkAdherenceCompliance(userId, adherenceScore) {
    try {
        if (adherenceScore < ADHERENCE_THRESHOLD) {
            // Create compliance alert
            const alertId = await (0, alerts_1.createAlert)({
                userId,
                type: 'medication',
                severity: 'high',
                message: `Medication adherence is below ${ADHERENCE_THRESHOLD}%. Current adherence: ${adherenceScore}%`,
                timestamp: new Date(),
                acknowledged: false,
                escalated: false,
                relatedData: {
                    adherenceScore,
                    threshold: ADHERENCE_THRESHOLD,
                    windowDays: ADHERENCE_WINDOW_DAYS,
                },
            });
            // Get care circle members
            const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(userId);
            if (careCircleMembers.length > 0) {
                // Notify care circle
                const alert = {
                    id: alertId,
                    userId,
                    type: 'medication',
                    severity: 'high',
                    message: `Medication adherence alert: ${adherenceScore}% over the past week`,
                    timestamp: new Date(),
                    acknowledged: false,
                    escalated: false,
                };
                await (0, notification_service_1.sendNotificationToCareCircle)(careCircleMembers.map(m => m.secondaryUserId), alert, ['push', 'sms', 'email']);
            }
            console.log(`Adherence compliance alert created for user ${userId}: ${adherenceScore}%`);
        }
    }
    catch (error) {
        console.error('Error checking adherence compliance:', error);
    }
}
/**
 * Main handler for adherence check event
 */
async function handler(event) {
    try {
        console.log('Checking medication adherence:', JSON.stringify(event));
        const detail = event.detail;
        const checkTime = (detail && detail.checkTime)
            ? new Date(detail.checkTime)
            : new Date();
        console.log('Check time:', checkTime.toISOString());
        // Get all users with medications
        const userIds = await getAllUsersWithMedications();
        console.log(`Checking adherence for ${userIds.length} users`);
        // Check each user's medications
        for (const userId of userIds) {
            try {
                const medications = await (0, medications_1.getMedicationsByUser)(userId);
                // Check for missed medications
                for (const medication of medications) {
                    if (medication.status === 'scheduled') {
                        if (isMedicationMissed(medication.scheduledTime, checkTime)) {
                            await handleMissedMedication(userId, medication);
                        }
                    }
                }
                // Calculate adherence score
                const adherenceScore = calculateAdherenceScore(medications);
                // Update adherence score for recent medications
                const recentMedications = medications.filter(med => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);
                    return med.scheduledTime >= weekAgo;
                });
                for (const medication of recentMedications) {
                    await (0, medications_1.updateAdherenceScore)(userId, medication.id, adherenceScore);
                }
                // Check adherence compliance
                await checkAdherenceCompliance(userId, adherenceScore);
                console.log(`User ${userId} adherence score: ${adherenceScore}%`);
            }
            catch (error) {
                console.error(`Error processing adherence for user ${userId}:`, error);
                // Continue with next user
            }
        }
        console.log('Medication adherence check complete');
    }
    catch (error) {
        console.error('Error in adherence check handler:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stbWVkaWNhdGlvbi1hZGhlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjaGVjay1tZWRpY2F0aW9uLWFkaGVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkNBQTZDO0FBQzdDLDhCQUE4QjtBQUM5QixrRkFBa0Y7O0FBNk1sRiwwQkEyREM7QUFyUUQsbUVBQXVIO0FBQ3ZILHlEQUEyRDtBQUMzRCxtRUFBeUU7QUFDekUseUVBQThFO0FBRTlFLDhEQUF1RTtBQUN2RSwwREFBb0Q7QUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRTlDLE1BQU0sOEJBQThCLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxhQUFhO0FBQ3BFLE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDLENBQUMsMEJBQTBCO0FBQzFELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0NBQWtDO0FBVW5FOztHQUVHO0FBQ0gsS0FBSyxVQUFVLDBCQUEwQjtJQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRWxDLElBQUksQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUM7WUFDdkQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksNEJBQTRCO1lBQ3hFLG9CQUFvQixFQUFFLFFBQVE7U0FDL0IsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztv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O2dCQUNoRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQzFDLEdBQUcsQ0FBQyxFQUFFO29CQUNKLE1BQU0sT0FBTyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQzNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLHFCQUFxQixDQUFDLENBQUM7b0JBQzNELE9BQU8sR0FBRyxDQUFDLGFBQWEsSUFBSSxPQUFPLENBQUM7Z0JBQ3RDLENBQUMsQ0FDRixDQUFDO2dCQUVGLEtBQUssTUFBTSxVQUFVLElBQUksaUJBQWlCLEVBQUUsQ0FBQztvQkFDM0MsTUFBTSxJQUFBLGtDQUFvQixFQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUNwRSxDQUFDO2dCQUVELDZCQUE2QjtnQkFDN0IsTUFBTSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBRXZELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxNQUFNLHFCQUFxQixjQUFjLEdBQUcsQ0FBQyxDQUFDO1lBQ3BFLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLE1BQU0sR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN2RSwwQkFBMEI7WUFDNUIsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDaGVjayBNZWRpY2F0aW9uIEFkaGVyZW5jZSBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogMi4yLCAyLjMsIDIuNVxuLy8gVHJpZ2dlcmVkIHBlcmlvZGljYWxseSB0byBjaGVjayBmb3IgbWlzc2VkIG1lZGljYXRpb25zIGFuZCBhZGhlcmVuY2UgY29tcGxpYW5jZVxuXG5pbXBvcnQgeyBFdmVudEJyaWRnZUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBnZXRNZWRpY2F0aW9uc0J5VXNlciwgdXBkYXRlTWVkaWNhdGlvblN0YXR1cywgdXBkYXRlQWRoZXJlbmNlU2NvcmUgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0IHsgY3JlYXRlQWxlcnQgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvYWxlcnRzJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXJzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUgfSBmcm9tICcuLi9zaGFyZWQvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xuaW1wb3J0IHsgSGVhbHRoQWxlcnQsIE1lZGljYXRpb25SZWNvcmQgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IHVubWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcblxuY29uc3QgZHluYW1vZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuXG5jb25zdCBNSVNTRURfTUVESUNBVElPTl9USFJFU0hPTERfTVMgPSAzMCAqIDYwICogMTAwMDsgLy8gMzAgbWludXRlc1xuY29uc3QgQURIRVJFTkNFX1RIUkVTSE9MRCA9IDgwOyAvLyA4MCUgYWRoZXJlbmNlIHRocmVzaG9sZFxuY29uc3QgQURIRVJFTkNFX1dJTkRPV19EQVlTID0gNzsgLy8gQ2FsY3VsYXRlIGFkaGVyZW5jZSBvdmVyIDcgZGF5c1xuXG5pbnRlcmZhY2UgQWRoZXJlbmNlQ2hlY2tFdmVudCB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICAnZGV0YWlsLXR5cGUnOiBzdHJpbmc7XG4gIGRldGFpbD86IHtcbiAgICBjaGVja1RpbWU/OiBzdHJpbmc7XG4gIH07XG59XG5cbi8qKlxuICogR2V0IGFsbCB1c2VycyB3aG8gaGF2ZSBtZWRpY2F0aW9uc1xuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBbGxVc2Vyc1dpdGhNZWRpY2F0aW9ucygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHVzZXJJZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGJDbGllbnQuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5NRURJQ0FUSU9OU19UQUJMRSB8fCAnaGVhbHRoY2FyZS1tZWRpY2F0aW9ucy1kZXYnLFxuICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICd1c2VySWQnLFxuICAgIH0pKTtcblxuICAgIGlmIChyZXN1bHQuSXRlbXMpIHtcbiAgICAgIHJlc3VsdC5JdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCB1bm1hcnNoYWxsZWQgPSB1bm1hcnNoYWxsKGl0ZW0pO1xuICAgICAgICBpZiAodW5tYXJzaGFsbGVkLnVzZXJJZCkge1xuICAgICAgICAgIHVzZXJJZHMuYWRkKHVubWFyc2hhbGxlZC51c2VySWQgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNjYW5uaW5nIG1lZGljYXRpb25zIHRhYmxlOicsIGVycm9yKTtcbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKHVzZXJJZHMpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIG1lZGljYXRpb24gaXMgbWlzc2VkICgzMCBtaW51dGVzIHBhc3Qgc2NoZWR1bGVkIHRpbWUpXG4gKi9cbmZ1bmN0aW9uIGlzTWVkaWNhdGlvbk1pc3NlZChzY2hlZHVsZWRUaW1lOiBEYXRlLCBjdXJyZW50VGltZTogRGF0ZSk6IGJvb2xlYW4ge1xuICBjb25zdCB0aW1lRGlmZiA9IGN1cnJlbnRUaW1lLmdldFRpbWUoKSAtIHNjaGVkdWxlZFRpbWUuZ2V0VGltZSgpO1xuICByZXR1cm4gdGltZURpZmYgPj0gTUlTU0VEX01FRElDQVRJT05fVEhSRVNIT0xEX01TO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBhZGhlcmVuY2Ugc2NvcmUgZm9yIGEgdXNlciBvdmVyIHRoZSBwYXN0IHdlZWtcbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlQWRoZXJlbmNlU2NvcmUobWVkaWNhdGlvbnM6IE1lZGljYXRpb25SZWNvcmRbXSk6IG51bWJlciB7XG4gIGNvbnN0IHdlZWtBZ28gPSBuZXcgRGF0ZSgpO1xuICB3ZWVrQWdvLnNldERhdGUod2Vla0Fnby5nZXREYXRlKCkgLSBBREhFUkVOQ0VfV0lORE9XX0RBWVMpO1xuXG4gIC8vIEZpbHRlciBtZWRpY2F0aW9ucyBmcm9tIHRoZSBwYXN0IHdlZWtcbiAgY29uc3QgcmVjZW50TWVkaWNhdGlvbnMgPSBtZWRpY2F0aW9ucy5maWx0ZXIoXG4gICAgbWVkID0+IG1lZC5zY2hlZHVsZWRUaW1lID49IHdlZWtBZ29cbiAgKTtcblxuICBpZiAocmVjZW50TWVkaWNhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIDEwMDsgLy8gTm8gbWVkaWNhdGlvbnMgc2NoZWR1bGVkLCBwZXJmZWN0IGFkaGVyZW5jZVxuICB9XG5cbiAgLy8gQ291bnQgdGFrZW4gbWVkaWNhdGlvbnNcbiAgY29uc3QgdGFrZW5Db3VudCA9IHJlY2VudE1lZGljYXRpb25zLmZpbHRlcihcbiAgICBtZWQgPT4gbWVkLnN0YXR1cyA9PT0gJ3Rha2VuJ1xuICApLmxlbmd0aDtcblxuICAvLyBDYWxjdWxhdGUgcGVyY2VudGFnZVxuICBjb25zdCBhZGhlcmVuY2VTY29yZSA9ICh0YWtlbkNvdW50IC8gcmVjZW50TWVkaWNhdGlvbnMubGVuZ3RoKSAqIDEwMDtcbiAgcmV0dXJuIE1hdGgucm91bmQoYWRoZXJlbmNlU2NvcmUpO1xufVxuXG4vKipcbiAqIE1hcmsgbWVkaWNhdGlvbiBhcyBtaXNzZWQgYW5kIG5vdGlmeSBjYXJlIGNpcmNsZVxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNaXNzZWRNZWRpY2F0aW9uKFxuICB1c2VySWQ6IHN0cmluZyxcbiAgbWVkaWNhdGlvbjogTWVkaWNhdGlvblJlY29yZFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgLy8gVXBkYXRlIG1lZGljYXRpb24gc3RhdHVzIHRvIG1pc3NlZFxuICAgIGF3YWl0IHVwZGF0ZU1lZGljYXRpb25TdGF0dXMoXG4gICAgICB1c2VySWQsXG4gICAgICBtZWRpY2F0aW9uLmlkLFxuICAgICAgJ21pc3NlZCdcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIGFsZXJ0IGZvciBtaXNzZWQgbWVkaWNhdGlvblxuICAgIGNvbnN0IGFsZXJ0SWQgPSBhd2FpdCBjcmVhdGVBbGVydCh7XG4gICAgICB1c2VySWQsXG4gICAgICB0eXBlOiAnbWVkaWNhdGlvbicsXG4gICAgICBzZXZlcml0eTogJ21lZGl1bScsXG4gICAgICBtZXNzYWdlOiBgTWlzc2VkIG1lZGljYXRpb246ICR7bWVkaWNhdGlvbi5tZWRpY2F0aW9uLm5hbWV9ICgke21lZGljYXRpb24ubWVkaWNhdGlvbi5kb3NhZ2V9KSBzY2hlZHVsZWQgYXQgJHttZWRpY2F0aW9uLnNjaGVkdWxlZFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcbiAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICBlc2NhbGF0ZWQ6IGZhbHNlLFxuICAgICAgcmVsYXRlZERhdGE6IHtcbiAgICAgICAgbWVkaWNhdGlvbklkOiBtZWRpY2F0aW9uLmlkLFxuICAgICAgICBtZWRpY2F0aW9uTmFtZTogbWVkaWNhdGlvbi5tZWRpY2F0aW9uLm5hbWUsXG4gICAgICAgIGRvc2FnZTogbWVkaWNhdGlvbi5tZWRpY2F0aW9uLmRvc2FnZSxcbiAgICAgICAgc2NoZWR1bGVkVGltZTogbWVkaWNhdGlvbi5zY2hlZHVsZWRUaW1lLnRvSVNPU3RyaW5nKCksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IGNhcmUgY2lyY2xlIG1lbWJlcnNcbiAgICBjb25zdCBjYXJlQ2lyY2xlTWVtYmVycyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHVzZXJJZCk7XG4gICAgXG4gICAgaWYgKGNhcmVDaXJjbGVNZW1iZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIE5vdGlmeSBjYXJlIGNpcmNsZVxuICAgICAgY29uc3QgYWxlcnQ6IEhlYWx0aEFsZXJ0ID0ge1xuICAgICAgICBpZDogYWxlcnRJZCxcbiAgICAgICAgdXNlcklkLFxuICAgICAgICB0eXBlOiAnbWVkaWNhdGlvbicsXG4gICAgICAgIHNldmVyaXR5OiAnbWVkaXVtJyxcbiAgICAgICAgbWVzc2FnZTogYCR7bWVkaWNhdGlvbi5tZWRpY2F0aW9uLm5hbWV9IG1lZGljYXRpb24gd2FzIG1pc3NlZGAsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcbiAgICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUoXG4gICAgICAgIGNhcmVDaXJjbGVNZW1iZXJzLm1hcChtID0+IG0uc2Vjb25kYXJ5VXNlcklkKSxcbiAgICAgICAgYWxlcnQsXG4gICAgICAgIFsncHVzaCcsICdzbXMnLCAnZW1haWwnXVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgTWFya2VkIG1lZGljYXRpb24gJHttZWRpY2F0aW9uLmlkfSBhcyBtaXNzZWQgZm9yIHVzZXIgJHt1c2VySWR9YCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaGFuZGxpbmcgbWlzc2VkIG1lZGljYXRpb246JywgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgYWRoZXJlbmNlIGNvbXBsaWFuY2UgYW5kIGdlbmVyYXRlIGFsZXJ0IGlmIGJlbG93IHRocmVzaG9sZFxuICovXG5hc3luYyBmdW5jdGlvbiBjaGVja0FkaGVyZW5jZUNvbXBsaWFuY2UoXG4gIHVzZXJJZDogc3RyaW5nLFxuICBhZGhlcmVuY2VTY29yZTogbnVtYmVyXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBpZiAoYWRoZXJlbmNlU2NvcmUgPCBBREhFUkVOQ0VfVEhSRVNIT0xEKSB7XG4gICAgICAvLyBDcmVhdGUgY29tcGxpYW5jZSBhbGVydFxuICAgICAgY29uc3QgYWxlcnRJZCA9IGF3YWl0IGNyZWF0ZUFsZXJ0KHtcbiAgICAgICAgdXNlcklkLFxuICAgICAgICB0eXBlOiAnbWVkaWNhdGlvbicsXG4gICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXG4gICAgICAgIG1lc3NhZ2U6IGBNZWRpY2F0aW9uIGFkaGVyZW5jZSBpcyBiZWxvdyAke0FESEVSRU5DRV9USFJFU0hPTER9JS4gQ3VycmVudCBhZGhlcmVuY2U6ICR7YWRoZXJlbmNlU2NvcmV9JWAsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcbiAgICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgICAgcmVsYXRlZERhdGE6IHtcbiAgICAgICAgICBhZGhlcmVuY2VTY29yZSxcbiAgICAgICAgICB0aHJlc2hvbGQ6IEFESEVSRU5DRV9USFJFU0hPTEQsXG4gICAgICAgICAgd2luZG93RGF5czogQURIRVJFTkNFX1dJTkRPV19EQVlTLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEdldCBjYXJlIGNpcmNsZSBtZW1iZXJzXG4gICAgICBjb25zdCBjYXJlQ2lyY2xlTWVtYmVycyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHVzZXJJZCk7XG4gICAgICBcbiAgICAgIGlmIChjYXJlQ2lyY2xlTWVtYmVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIE5vdGlmeSBjYXJlIGNpcmNsZVxuICAgICAgICBjb25zdCBhbGVydDogSGVhbHRoQWxlcnQgPSB7XG4gICAgICAgICAgaWQ6IGFsZXJ0SWQsXG4gICAgICAgICAgdXNlcklkLFxuICAgICAgICAgIHR5cGU6ICdtZWRpY2F0aW9uJyxcbiAgICAgICAgICBzZXZlcml0eTogJ2hpZ2gnLFxuICAgICAgICAgIG1lc3NhZ2U6IGBNZWRpY2F0aW9uIGFkaGVyZW5jZSBhbGVydDogJHthZGhlcmVuY2VTY29yZX0lIG92ZXIgdGhlIHBhc3Qgd2Vla2AsXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBzZW5kTm90aWZpY2F0aW9uVG9DYXJlQ2lyY2xlKFxuICAgICAgICAgIGNhcmVDaXJjbGVNZW1iZXJzLm1hcChtID0+IG0uc2Vjb25kYXJ5VXNlcklkKSxcbiAgICAgICAgICBhbGVydCxcbiAgICAgICAgICBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ11cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc29sZS5sb2coYEFkaGVyZW5jZSBjb21wbGlhbmNlIGFsZXJ0IGNyZWF0ZWQgZm9yIHVzZXIgJHt1c2VySWR9OiAke2FkaGVyZW5jZVNjb3JlfSVgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgYWRoZXJlbmNlIGNvbXBsaWFuY2U6JywgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogTWFpbiBoYW5kbGVyIGZvciBhZGhlcmVuY2UgY2hlY2sgZXZlbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEV2ZW50QnJpZGdlRXZlbnQ8c3RyaW5nLCBBZGhlcmVuY2VDaGVja0V2ZW50Pik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyBtZWRpY2F0aW9uIGFkaGVyZW5jZTonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuXG4gICAgY29uc3QgZGV0YWlsID0gZXZlbnQuZGV0YWlsIGFzIHsgY2hlY2tUaW1lPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgY2hlY2tUaW1lID0gKGRldGFpbCAmJiBkZXRhaWwuY2hlY2tUaW1lKSBcbiAgICAgID8gbmV3IERhdGUoZGV0YWlsLmNoZWNrVGltZSkgXG4gICAgICA6IG5ldyBEYXRlKCk7XG4gICAgY29uc29sZS5sb2coJ0NoZWNrIHRpbWU6JywgY2hlY2tUaW1lLnRvSVNPU3RyaW5nKCkpO1xuXG4gICAgLy8gR2V0IGFsbCB1c2VycyB3aXRoIG1lZGljYXRpb25zXG4gICAgY29uc3QgdXNlcklkcyA9IGF3YWl0IGdldEFsbFVzZXJzV2l0aE1lZGljYXRpb25zKCk7XG4gICAgY29uc29sZS5sb2coYENoZWNraW5nIGFkaGVyZW5jZSBmb3IgJHt1c2VySWRzLmxlbmd0aH0gdXNlcnNgKTtcblxuICAgIC8vIENoZWNrIGVhY2ggdXNlcidzIG1lZGljYXRpb25zXG4gICAgZm9yIChjb25zdCB1c2VySWQgb2YgdXNlcklkcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbWVkaWNhdGlvbnMgPSBhd2FpdCBnZXRNZWRpY2F0aW9uc0J5VXNlcih1c2VySWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1pc3NlZCBtZWRpY2F0aW9uc1xuICAgICAgICBmb3IgKGNvbnN0IG1lZGljYXRpb24gb2YgbWVkaWNhdGlvbnMpIHtcbiAgICAgICAgICBpZiAobWVkaWNhdGlvbi5zdGF0dXMgPT09ICdzY2hlZHVsZWQnKSB7XG4gICAgICAgICAgICBpZiAoaXNNZWRpY2F0aW9uTWlzc2VkKG1lZGljYXRpb24uc2NoZWR1bGVkVGltZSwgY2hlY2tUaW1lKSkge1xuICAgICAgICAgICAgICBhd2FpdCBoYW5kbGVNaXNzZWRNZWRpY2F0aW9uKHVzZXJJZCwgbWVkaWNhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIGFkaGVyZW5jZSBzY29yZVxuICAgICAgICBjb25zdCBhZGhlcmVuY2VTY29yZSA9IGNhbGN1bGF0ZUFkaGVyZW5jZVNjb3JlKG1lZGljYXRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhZGhlcmVuY2Ugc2NvcmUgZm9yIHJlY2VudCBtZWRpY2F0aW9uc1xuICAgICAgICBjb25zdCByZWNlbnRNZWRpY2F0aW9ucyA9IG1lZGljYXRpb25zLmZpbHRlcihcbiAgICAgICAgICBtZWQgPT4ge1xuICAgICAgICAgICAgY29uc3Qgd2Vla0FnbyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICB3ZWVrQWdvLnNldERhdGUod2Vla0Fnby5nZXREYXRlKCkgLSBBREhFUkVOQ0VfV0lORE9XX0RBWVMpO1xuICAgICAgICAgICAgcmV0dXJuIG1lZC5zY2hlZHVsZWRUaW1lID49IHdlZWtBZ287XG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGZvciAoY29uc3QgbWVkaWNhdGlvbiBvZiByZWNlbnRNZWRpY2F0aW9ucykge1xuICAgICAgICAgIGF3YWl0IHVwZGF0ZUFkaGVyZW5jZVNjb3JlKHVzZXJJZCwgbWVkaWNhdGlvbi5pZCwgYWRoZXJlbmNlU2NvcmUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgYWRoZXJlbmNlIGNvbXBsaWFuY2VcbiAgICAgICAgYXdhaXQgY2hlY2tBZGhlcmVuY2VDb21wbGlhbmNlKHVzZXJJZCwgYWRoZXJlbmNlU2NvcmUpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBVc2VyICR7dXNlcklkfSBhZGhlcmVuY2Ugc2NvcmU6ICR7YWRoZXJlbmNlU2NvcmV9JWApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyBhZGhlcmVuY2UgZm9yIHVzZXIgJHt1c2VySWR9OmAsIGVycm9yKTtcbiAgICAgICAgLy8gQ29udGludWUgd2l0aCBuZXh0IHVzZXJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnTWVkaWNhdGlvbiBhZGhlcmVuY2UgY2hlY2sgY29tcGxldGUnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBhZGhlcmVuY2UgY2hlY2sgaGFuZGxlcjonLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==