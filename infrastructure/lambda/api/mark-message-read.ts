// Mark Message as Read Lambda Function
// Requirements: 4.4
// Marks a message as read and notifies the sender

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { TABLES, getItem, updateItem } from '../shared/dynamodb-client';
import { sendNotification } from '../shared/notification-service';
import { getUser } from '../shared/data-access/users';

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

/**
 * Mark a message as read and notify the sender
 */
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

    // Get the message from DynamoDB
    const message = await getItem<CareCircleMessage>(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      { messageId }
    );

    if (!message) {
      return createErrorResponse(404, 'Message not found');
    }

    // Verify the requesting user is the recipient
    if (message.recipientId !== requestingUserId) {
      return createErrorResponse(403, 'You can only mark your own messages as read');
    }

    // Check if already marked as read
    if (message.status === 'read') {
      return createSuccessResponse({
        message: 'Message already marked as read',
        readAt: message.readAt,
      });
    }

    // Update message status to read
    const now = new Date();
    await updateItem(
      TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev',
      { messageId },
      {
        status: 'read',
        readAt: now.toISOString(),
      }
    );

    // Get sender and recipient information for notification
    const sender = await getUser(message.senderId);
    const recipient = await getUser(message.recipientId);

    if (sender && recipient) {
      // Send notification to the sender that their message was read
      const recipientName = `${recipient.profile.firstName} ${recipient.profile.lastName}`;
      const notificationMessage = message.subject
        ? `${recipientName} read your message: "${message.subject}"`
        : `${recipientName} read your message`;

      await sendNotification({
        recipient: message.senderId,
        alert: {
          id: `read-${messageId}`,
          userId: message.senderId,
          type: 'check_in',
          severity: 'low',
          message: notificationMessage,
          timestamp: now,
          acknowledged: false,
          escalated: false,
        },
        channels: ['push'], // Only push notification for read receipts
      });
    }

    return createSuccessResponse({
      message: 'Message marked as read',
      readAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return createErrorResponse(500, 'Failed to mark message as read');
  }
}
