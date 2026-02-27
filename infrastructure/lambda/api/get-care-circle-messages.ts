// Get Care Circle Messages Lambda Function
// Requirements: 4.4
// Retrieves messages for a user with read receipt tracking

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { checkPermission } from '../shared/data-access/care-circle';
import { TABLES, queryItems } from '../shared/dynamodb-client';

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
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from path parameters
    const primaryUserId = event.pathParameters?.userId;
    if (!primaryUserId) {
      return createErrorResponse(400, 'userId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Check permissions
    if (requestingUserId !== primaryUserId) {
      const hasPermission = await checkPermission(primaryUserId, requestingUserId, 'canSendMessages');
      if (!hasPermission) {
        return createErrorResponse(403, 'You do not have permission to view messages');
      }
    }

    // Get query parameters
    const limit = event.queryStringParameters?.limit 
      ? parseInt(event.queryStringParameters.limit) 
      : 50;
    const conversationWith = event.queryStringParameters?.conversationWith;

    // Query messages where user is sender or recipient
    let messages: CareCircleMessage[] = [];

    // Get messages where user is recipient
    const receivedMessages = await queryItems<CareCircleMessage>(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      'recipientId = :recipientId',
      { ':recipientId': requestingUserId },
      'recipientId-index'
    );

    // Get messages where user is sender
    const sentMessages = await queryItems<CareCircleMessage>(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      'senderId = :senderId',
      { ':senderId': requestingUserId },
      'senderId-index'
    );

    messages = [...receivedMessages, ...sentMessages];

    // Filter by conversation if specified
    if (conversationWith) {
      messages = messages.filter(
        msg => 
          (msg.senderId === conversationWith && msg.recipientId === requestingUserId) ||
          (msg.senderId === requestingUserId && msg.recipientId === conversationWith)
      );
    }

    // Sort by sent date (newest first)
    messages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    // Apply limit
    messages = messages.slice(0, limit);

    // Calculate unread count
    const unreadCount = receivedMessages.filter(msg => msg.status !== 'read').length;

    return createSuccessResponse({
      messages,
      totalCount: messages.length,
      unreadCount,
    });
  } catch (error) {
    console.error('Error getting care circle messages:', error);
    return createErrorResponse(500, 'Failed to retrieve messages');
  }
}
