// Send Care Circle Message Lambda Function
// Requirements: 4.4
// Sends a message between care circle members with read receipts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { checkPermission } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';
import { TABLES, putItem } from '../shared/dynamodb-client';
import { sendNotification } from '../shared/notification-service';

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

interface SendMessageRequest {
  recipientId: string;
  subject?: string;
  content: string;
}

/**
 * Generate message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: SendMessageRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.recipientId || !request.content) {
      return createErrorResponse(400, 'recipientId and content are required');
    }

    // Validate content length
    if (request.content.length > 5000) {
      return createErrorResponse(400, 'Message content cannot exceed 5000 characters');
    }

    // Determine sender and recipient roles
    let senderId: string;
    let recipientId: string;

    if (requestingUserId === primaryUserId) {
      // Primary user sending to care circle member
      senderId = primaryUserId;
      recipientId = request.recipientId;
      
      // Check if recipient is in care circle
      const hasPermission = await checkPermission(primaryUserId, recipientId, 'canSendMessages');
      if (!hasPermission) {
        return createErrorResponse(403, 'Recipient is not in your care circle or does not have messaging permission');
      }
    } else {
      // Care circle member sending to primary user
      senderId = requestingUserId;
      recipientId = primaryUserId;
      
      // Check if sender has permission to send messages
      const hasPermission = await checkPermission(primaryUserId, requestingUserId, 'canSendMessages');
      if (!hasPermission) {
        return createErrorResponse(403, 'You do not have permission to send messages to this user');
      }
    }

    // Get sender and recipient information
    const sender = await getUser(senderId);
    const recipient = await getUser(recipientId);

    if (!sender || !recipient) {
      return createErrorResponse(404, 'Sender or recipient not found');
    }

    // Create message
    const messageId = generateMessageId();
    const now = new Date();

    const message: CareCircleMessage = {
      messageId,
      primaryUserId,
      senderId,
      recipientId,
      subject: request.subject,
      content: request.content,
      sentAt: now.toISOString(),
      status: 'sent',
    };

    // Store message in DynamoDB
    await putItem(TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev', message);

    // Send notification to recipient
    const senderName = `${sender.profile.firstName} ${sender.profile.lastName}`;
    const notificationMessage = request.subject 
      ? `${senderName}: ${request.subject}`
      : `${senderName} sent you a message`;

    await sendNotification({
      recipient: recipientId,
      alert: {
        id: messageId,
        userId: recipientId,
        type: 'check_in',
        severity: 'low',
        message: notificationMessage,
        timestamp: now,
        acknowledged: false,
        escalated: false,
      },
      channels: ['push', 'email'],
    });

    return createSuccessResponse({
      message: 'Message sent successfully',
      messageId,
      sentAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error sending care circle message:', error);
    return createErrorResponse(500, 'Failed to send message');
  }
}
