// Data Breach Notification Service
// Requirements: 8.3 - HIPAA breach notification procedures

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { logAuditEvent, logSecurityEvent } from './audit-logger';

const ses = new SESClient({});
const sns = new SNSClient({});
const dynamodb = new DynamoDBClient({});

const BREACH_LOG_TABLE = process.env.BREACH_LOG_TABLE || 'healthcare-breach-log';
const SECURITY_TEAM_EMAIL = process.env.SECURITY_TEAM_EMAIL || 'security@healthcare-app.com';
const SECURITY_TEAM_PHONE = process.env.SECURITY_TEAM_PHONE || '';

export interface BreachIncident {
  incidentId: string;
  detectedAt: string;
  breachType: 'unauthorized_access' | 'data_exposure' | 'system_compromise' | 'device_theft' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: string[];
  affectedDataTypes: string[];
  description: string;
  detectionMethod: string;
  containmentActions: string[];
  notificationRequired: boolean;
  notificationSent: boolean;
  hhsNotificationRequired: boolean;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
}

/**
 * Detect and log potential data breach
 * Requirements: 8.3 - Breach detection and logging
 */
export async function detectBreach(
  breachType: BreachIncident['breachType'],
  severity: BreachIncident['severity'],
  affectedUsers: string[],
  affectedDataTypes: string[],
  description: string,
  detectionMethod: string
): Promise<string> {
  const incidentId = `BREACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const incident: BreachIncident = {
    incidentId,
    detectedAt: new Date().toISOString(),
    breachType,
    severity,
    affectedUsers,
    affectedDataTypes,
    description,
    detectionMethod,
    containmentActions: [],
    notificationRequired: affectedUsers.length > 0,
    notificationSent: false,
    hhsNotificationRequired: affectedUsers.length >= 500,
    status: 'detected',
  };

  // Log breach incident
  const command = new PutItemCommand({
    TableName: BREACH_LOG_TABLE,
    Item: marshall(incident),
  });
  await dynamodb.send(command);

  // Log security event
  await logSecurityEvent(
    'BREACH_DETECTED',
    'system',
    'system',
    severity,
    description,
    undefined,
    {
      incidentId,
      affectedUserCount: affectedUsers.length,
      affectedDataTypes,
      hhsNotificationRequired: incident.hhsNotificationRequired,
    }
  );

  // Immediate notification to security team
  await notifySecurityTeam(incident);

  return incidentId;
}

/**
 * Notify security team of breach
 * Requirements: 8.3 - Immediate breach notification
 */
async function notifySecurityTeam(incident: BreachIncident): Promise<void> {
  const subject = `[${incident.severity.toUpperCase()}] Data Breach Detected - ${incident.incidentId}`;
  const body = `
Data Breach Incident Report

Incident ID: ${incident.incidentId}
Detected At: ${incident.detectedAt}
Severity: ${incident.severity}
Breach Type: ${incident.breachType}

Affected Users: ${incident.affectedUsers.length}
Affected Data Types: ${incident.affectedDataTypes.join(', ')}

Description:
${incident.description}

Detection Method: ${incident.detectionMethod}

HHS Notification Required: ${incident.hhsNotificationRequired ? 'YES (>500 individuals)' : 'NO'}

Immediate Actions Required:
1. Assess the scope of the breach
2. Contain the breach
3. Begin investigation
4. Prepare notification to affected individuals (within 60 days)
${incident.hhsNotificationRequired ? '5. Notify HHS within 60 days' : ''}

Please respond immediately to acknowledge receipt.
  `;

  // Send email to security team
  try {
    const emailCommand = new SendEmailCommand({
      Source: SECURITY_TEAM_EMAIL,
      Destination: {
        ToAddresses: [SECURITY_TEAM_EMAIL],
      },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    });
    await ses.send(emailCommand);
  } catch (error) {
    console.error('Failed to send email to security team:', error);
  }

  // Send SMS if phone number configured
  if (SECURITY_TEAM_PHONE) {
    try {
      const smsCommand = new PublishCommand({
        PhoneNumber: SECURITY_TEAM_PHONE,
        Message: `URGENT: Data breach detected. Incident ID: ${incident.incidentId}. Check email for details.`,
      });
      await sns.send(smsCommand);
    } catch (error) {
      console.error('Failed to send SMS to security team:', error);
    }
  }
}

/**
 * Notify affected individuals of breach
 * Requirements: 8.3 - Individual breach notification (within 60 days)
 */
export async function notifyAffectedIndividuals(
  incidentId: string,
  affectedUsers: { userId: string; email: string; name: string }[]
): Promise<void> {
  console.log(`Notifying ${affectedUsers.length} affected individuals for incident ${incidentId}`);

  for (const user of affectedUsers) {
    const subject = 'Important Security Notice - Healthcare Monitoring App';
    const body = `
Dear ${user.name},

We are writing to inform you of a security incident that may have affected your personal health information.

Incident Details:
- Incident ID: ${incidentId}
- Date Detected: ${new Date().toISOString()}

What Happened:
We recently discovered a security incident that may have resulted in unauthorized access to some of your health information stored in our Healthcare Monitoring App.

What Information Was Involved:
[Specific data types will be listed here based on the incident]

What We Are Doing:
- We have taken immediate steps to contain the incident
- We are conducting a thorough investigation
- We have implemented additional security measures
- We are working with law enforcement and regulatory authorities

What You Can Do:
- Monitor your accounts for any suspicious activity
- Review your health records for any unauthorized changes
- Contact us if you notice anything unusual
- Consider placing a fraud alert on your credit reports

We take the security of your information very seriously and sincerely apologize for this incident.

For More Information:
If you have questions or concerns, please contact us at:
Email: ${SECURITY_TEAM_EMAIL}
Phone: ${SECURITY_TEAM_PHONE}

You may also contact the U.S. Department of Health and Human Services at:
https://www.hhs.gov/hipaa/filing-a-complaint/index.html

Sincerely,
Healthcare Monitoring App Security Team
    `;

    try {
      const command = new SendEmailCommand({
        Source: SECURITY_TEAM_EMAIL,
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      });
      await ses.send(command);

      await logAuditEvent({
        eventType: 'BREACH_NOTIFICATION_SENT',
        userId: user.userId,
        userType: 'primary',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          incidentId,
          notificationMethod: 'email',
        },
      });
    } catch (error) {
      console.error(`Failed to notify user ${user.userId}:`, error);
      
      await logAuditEvent({
        eventType: 'BREACH_NOTIFICATION_FAILED',
        userId: user.userId,
        userType: 'primary',
        timestamp: new Date().toISOString(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          incidentId,
        },
      });
    }
  }
}

/**
 * Generate HHS breach notification report
 * Requirements: 8.3 - HHS notification for breaches affecting >500 individuals
 */
export async function generateHHSReport(incidentId: string): Promise<string> {
  // This would generate a formal report for HHS submission
  // In production, this would create a detailed PDF report
  
  const report = `
HHS BREACH NOTIFICATION REPORT

Incident ID: ${incidentId}
Covered Entity: Healthcare Monitoring App
Date of Breach: ${new Date().toISOString()}
Date Discovered: ${new Date().toISOString()}

Number of Individuals Affected: [To be filled]
Types of Information Involved: [To be filled]

Description of Breach:
[Detailed description of the breach]

Actions Taken:
[List of containment and remediation actions]

Notification to Individuals:
Date notifications sent: [To be filled]
Method of notification: Email

This report is submitted in compliance with 45 CFR §164.408.
  `;

  await logAuditEvent({
    eventType: 'HHS_REPORT_GENERATED',
    userId: 'system',
    userType: 'system',
    timestamp: new Date().toISOString(),
    success: true,
    metadata: {
      incidentId,
      reportLength: report.length,
    },
  });

  return report;
}

/**
 * Update breach incident status
 * Requirements: 8.3 - Breach incident tracking
 */
export async function updateBreachStatus(
  incidentId: string,
  status: BreachIncident['status'],
  containmentActions: string[]
): Promise<void> {
  // Update incident in database
  console.log(`Updating breach ${incidentId} to status: ${status}`);

  await logAuditEvent({
    eventType: 'BREACH_STATUS_UPDATED',
    userId: 'system',
    userType: 'system',
    timestamp: new Date().toISOString(),
    success: true,
    metadata: {
      incidentId,
      newStatus: status,
      containmentActions,
    },
  });
}
