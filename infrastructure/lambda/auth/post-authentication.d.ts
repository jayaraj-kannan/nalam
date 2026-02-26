import { PostAuthenticationTriggerHandler } from 'aws-lambda';
/**
 * Post-Authentication Trigger
 *
 * This Lambda function is triggered after a user successfully authenticates.
 * It can be used to:
 * - Update last login timestamp
 * - Log successful authentication
 * - Send notifications to care circle (for primary users)
 * - Track login patterns
 * - Initialize session data
 */
export declare const handler: PostAuthenticationTriggerHandler;
