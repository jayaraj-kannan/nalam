// Trigger Emergency Alert Lambda Function
// Requirements: 3.3, 3.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, EmergencyEvent, EmergencySeverity, EmergencyType, GeoLocation } from '../shared/types';
import { getUser } from '../shared/data-access/users';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { createAlert } from '../shared/data-access/alerts';
import { logAuditEvent } from '../shared/audit-logger';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const eventBridge = new EventBridgeClient({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

interface TriggerEmergencyRequest {
  userId: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  location?: GeoLocation;
  symptoms?: string[];
  notes?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: TriggerEmergencyRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.type || !request.severity) {
      return createErrorResponse(400, 'Missing required fields: userId, type, severity');
    }

    // Validate emergency type
    const validTypes: EmergencyType[] = ['fall', 'abnormal_vitals', 'missed_check_in', 'manual_alert', 'device_alert'];
    if (!validTypes.includes(request.type)) {
      return createErrorResponse(400, 'Invalid emergency type');
    }

    // Validate severity
    const validSeverities: EmergencySeverity[] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(request.severity)) {
      return createErrorResponse(400, 'Invalid severity');
    }

    // Get user information including health profile
    const user = await getUser(request.userId);
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Get care circle members
    const careCircleMembers = await getCareCircleMembers(request.userId);
    const responders = careCircleMembers
      .filter(m => m.permissions.canReceiveAlerts)
      .map(m => m.secondaryUserId);

    // Create emergency event ID
    const emergencyId = `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Store emergency event
    const emergencyEvent: EmergencyEvent = {
      id: emergencyId,
      userId: request.userId,
      type: request.type,
      timestamp,
      location: request.location,
      symptoms: request.symptoms,
      severity: request.severity,
      responders,
      resolved: false,
      notes: request.notes,
    };

    await dynamodb.send(new PutCommand({
      TableName: process.env.EMERGENCY_EVENTS_TABLE || 'healthcare-emergency-events-dev',
      Item: {
        ...emergencyEvent,
        timestamp: timestamp.toISOString(),
      },
    }));

    // Create alert for the emergency
    const alertId = await createAlert({
      userId: request.userId,
      type: 'emergency',
      severity: request.severity === 'critical' ? 'critical' : 'high',
      message: `Emergency: ${request.type.replace(/_/g, ' ')}${request.symptoms ? ` - Symptoms: ${request.symptoms.join(', ')}` : ''}`,
      timestamp,
      acknowledged: false,
      escalated: true,
      escalationLevel: request.severity === 'critical' ? 'emergency_services' : 'emergency_contact',
      relatedData: {
        emergencyId,
        location: request.location,
        symptoms: request.symptoms,
      },
    });

    // Prepare emergency information for responders
    const emergencyInfo = {
      emergencyId,
      alertId,
      userId: request.userId,
      userName: `${user.profile.firstName} ${user.profile.lastName}`,
      type: request.type,
      severity: request.severity,
      timestamp: timestamp.toISOString(),
      location: request.location,
      symptoms: request.symptoms,
      // Medical history for emergency services (Requirement 3.5)
      medicalHistory: 'healthProfile' in user ? {
        conditions: user.healthProfile.conditions,
        medications: user.healthProfile.medications,
        allergies: user.healthProfile.allergies,
        emergencyContacts: user.healthProfile.emergencyContacts,
        healthcareProviders: user.healthProfile.healthcareProviders,
      } : undefined,
      responders,
    };

    // Publish emergency event to EventBridge for immediate notification
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'healthcare.emergency',
        DetailType: 'EmergencyTriggered',
        Detail: JSON.stringify(emergencyInfo),
        EventBusName: process.env.EVENT_BUS_NAME || 'default',
      }],
    }));

    // Log audit event
    await logAuditEvent({
      eventType: 'EMERGENCY_TRIGGERED',
      userId: request.userId,
      userType: 'primary',
      action: 'TRIGGER_EMERGENCY',
      resource: `emergency/${emergencyId}`,
      timestamp: timestamp.toISOString(),
      success: true,
    });

    return createSuccessResponse({
      emergencyId,
      alertId,
      message: 'Emergency alert triggered successfully',
      responders: responders.length,
    });
  } catch (error) {
    console.error('Error triggering emergency:', error);
    return createErrorResponse(500, 'Failed to trigger emergency alert');
  }
}
