import { PreAuthenticationTriggerHandler } from 'aws-lambda';
/**
 * Pre-Authentication Trigger
 *
 * This Lambda function is triggered before a user is authenticated.
 * It can be used to:
 * - Perform custom validation
 * - Check if user account is active
 * - Implement custom authentication logic
 * - Log authentication attempts
 * - Block suspicious login attempts
 */
export declare const handler: PreAuthenticationTriggerHandler;
