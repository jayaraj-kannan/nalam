// Get Care Circle Messages Lambda Function
// Requirements: 4.4
// Retrieves messages between care circle members

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { checkPermission } from '../shared/data-access/care-circle';
import { TABLES, queryItems } from '../shared/dynamodb-client';

interface HealthDataAttachment {
  type: 'vitals' | 'medication' | 'appointment';
  data: any;
  summary: string;
}

interface CareCircleMessage {
  messageId: string;
  primaryUserId: string;
  senderId: string;
  recipientId: string;
  subject?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  status: 'sent' | 'delivered' | 'read';
  healthData?: HealthDataAttachment;
}

/**
 * Get messages for a care circle conversation
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from query parameters
    const primaryUserId = event.queryStringParameters?.userId;
    if (!primaryUserId) {
      return createErrorResponse(400, 'userId is required in query parameters');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Check permissions
    if (requestingUserId !== primaryUserId) {
      // Care circle member accessing primary user's messages
      const hasPermission = await checkPermission(primaryUserId, requestingUserId, 'canSendMessages');
      if (!hasPermission) {
        return createErrorResponse(403, 'You do not have permission to view these messages');
      }
    }

    // Get limit from query parameters (default 50, max 100)
    const limit = Math.min(
      parseInt(event.queryStringParameters?.limit || '50', 10),
      100
    );

    // Query messages where the user is either sender or recipient
    // In a real implementation, this would use a GSI to efficiently query messages
    // For now, we'll use a simple query approach
    const messages = await queryItems<CareCircleMessage>(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      'primaryUserId',
      primaryUserId,
      limit
    );

    // Filter messages to only include those involving the requesting user
    const filteredMessages = messages.filter(
      msg => msg.senderId === requestingUserId || msg.recipientId === requestingUserId
    );

    // Sort by timestamp (most recent last)
    filteredMessages.sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    return createSuccessResponse({
      messages: filteredMessages,
      count: filteredMessages.length,
    });
  } catch (error) {
    console.error('Error retrieving care circle messages:', error);
    return createErrorResponse(500, 'Failed to retrieve messages');
  }
}
