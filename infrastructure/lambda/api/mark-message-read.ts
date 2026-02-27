// Mark Message as Read Lambda Function
// Requirements: 4.4
// Marks a message as read and updates read receipt

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { TABLES, getItem, updateItem } from '../shared/dynamodb-client';
import { sendNotification } from '../shared/notification-service';

interface CareCircleMessage {
  messageId: string;
  primaryUserId: string;
  senderId: string;
  recipientId: string;
  status: 'sent' | 'delivered' | 'read';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get messageId from path parameters
    const messageId = event.pathParameters?.messageId;
    if (!messageId) {
      return createErrorResponse(400, 'messageId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Get message from DynamoDB
    const message = await getItem<CareCircleMessage>(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      { messageId }
    );

    if (!message) {
      return createErrorResponse(404, 'Message not found');
    }

    // Check if requesting user is the recipient
    if (message.recipientId !== requestingUserId) {
      return createErrorResponse(403, 'You can only mark your own messages as read');
    }

    // Check if already read
    if (message.status === 'read') {
      return createSuccessResponse({
        message: 'Message already marked as read',
        messageId,
      });
    }

    // Update message status
    const now = new Date();
    await updateItem(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      { messageId },
      'SET #status = :status, readAt = :readAt',
      {
        ':status': 'read',
        ':readAt': now.toISOString(),
      },
      { '#status': 'status' }
    );

    // Notify sender that message was read
    await sendNotification({
      recipient: message.senderId,
      alert: {
        id: `read-receipt-${messageId}`,
        userId: message.senderId,
        type: 'check_in',
        severity: 'low',
        message: 'Your message was read',
        timestamp: now,
        acknowledged: false,
        escalated: false,
      },
      channels: ['push'],
    });

    return createSuccessResponse({
      message: 'Message marked as read',
      messageId,
      readAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return createErrorResponse(500, 'Failed to mark message as read');
  }
}
