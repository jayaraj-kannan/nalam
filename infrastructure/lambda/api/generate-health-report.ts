// Generate Health Report Lambda Function
// Requirements: 10.1, 10.3, 10.4 - Generate PDF reports with health trends

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createSuccessResponse, createErrorResponse, ReportType, HealthReport, TimeRange } from '../shared/types';
import { queryVitalSigns } from '../shared/timestream-client';
import { checkPermission } from '../shared/access-control';
import { logDataAccess } from '../shared/audit-logger';
import { getUser } from '../shared/data-access/users';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const REPORTS_BUCKET = process.env.REPORTS_BUCKET || 'healthcare-reports-dev';

/**
 * Calculate time range based on report type
 */
function getTimeRangeForReportType(reportType: ReportType): TimeRange {
  const endTime = new Date();
  let startTime: Date;

  switch (reportType) {
    case 'weekly':
      startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarterly':
      startTime = new Date(endTime.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'annual':
      startTime = new Date(endTime.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start: startTime, end: endTime };
}

/**
 * Calculate statistics for a metric
 */
function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, latest: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const latest = values[values.length - 1];

  return { min, max, avg, latest };
}

/**
 * Generate summary text for the report
 */
function generateSummary(
  reportType: ReportType,
  metricsData: Record<string, any>,
  recommendations: string[]
): string {
  const period = reportType === 'weekly' ? 'week' : reportType === 'monthly' ? 'month' : reportType === 'quarterly' ? 'quarter' : 'year';
  const metricsCount = Object.keys(metricsData).length;

  let summary = `Health Report for the past ${period}. `;
  summary += `Analyzed ${metricsCount} health metrics. `;

  if (recommendations.length > 0) {
    summary += `${recommendations.length} recommendations provided. `;
  } else {
    summary += 'All metrics within normal ranges. ';
  }

  return summary;
}

/**
 * Generate recommendations based on health data
 */
function generateRecommendations(metricsData: Record<string, any>): string[] {
  const recommendations: string[] = [];

  for (const [metric, data] of Object.entries(metricsData)) {
    const { avg, latest, trend } = data;

    if (trend === 'concerning' || trend === 'declining') {
      const metricName = metric.replace(/_/g, ' ');
      recommendations.push(`Monitor ${metricName} closely. Current average: ${avg.toFixed(1)}. Consider consulting your healthcare provider.`);
    }
  }

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring your health regularly.');
    recommendations.push('Maintain a healthy lifestyle with regular exercise and balanced diet.');
  }

  return recommendations;
}

/**
 * Generate PDF content (simplified HTML format for now)
 * In production, this would use a PDF generation library like PDFKit or Puppeteer
 */
function generatePDFContent(report: HealthReport, userName: string, medicationSummary?: string): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Health Report - ${report.reportType}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; margin-top: 30px; }
    .header { border-bottom: 2px solid #3498db; padding-bottom: 20px; }
    .metric { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #3498db; }
    .recommendation { margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
    .medication-section { margin: 20px 0; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Health Report</h1>
    <p><strong>Patient:</strong> ${userName}</p>
    <p><strong>Report Type:</strong> ${report.reportType}</p>
    <p><strong>Period:</strong> ${new Date(report.timeRange.start).toLocaleDateString()} - ${new Date(report.timeRange.end).toLocaleDateString()}</p>
    <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
  </div>

  <h2>Summary</h2>
  <p>${report.summary}</p>

  ${medicationSummary ? `
  <h2>Medication Adherence</h2>
  <div class="medication-section">
    ${medicationSummary}
  </div>
  ` : ''}

  <h2>Health Trends</h2>
  ${report.trends.map(trend => `
    <div class="metric">
      <h3>${trend.metric.replace(/_/g, ' ').toUpperCase()}</h3>
      <p><strong>Trend:</strong> ${trend.trend}</p>
      <p><strong>Analysis:</strong> ${trend.analysis}</p>
      <p><strong>Data Points:</strong> ${trend.dataPoints.length}</p>
    </div>
  `).join('')}

  <h2>Recommendations</h2>
  ${report.recommendations.map(rec => `
    <div class="recommendation">
      <p>${rec}</p>
    </div>
  `).join('')}

  <div class="footer">
    <p>This report is for informational purposes only and should not replace professional medical advice.</p>
    <p>Report ID: ${report.id}</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Generate health report
 * POST /api/v1/health/reports/generate
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract user info from authorizer context
    const requestingUserId = event.requestContext.authorizer?.principalId;
    const requestingUserType = event.requestContext.authorizer?.userType as 'primary' | 'secondary';

    if (!requestingUserId || !requestingUserType) {
      return createErrorResponse(401, 'Unauthorized: Missing user context');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Missing request body');
    }

    const body = JSON.parse(event.body);
    const { userId, reportType } = body;

    if (!userId || !reportType) {
      return createErrorResponse(400, 'Missing userId or reportType');
    }

    // Validate report type
    const validReportTypes: ReportType[] = ['weekly', 'monthly', 'quarterly', 'annual'];
    if (!validReportTypes.includes(reportType)) {
      return createErrorResponse(400, 'Invalid report type');
    }

    // Check permissions
    const hasPermission = await checkPermission(
      requestingUserId,
      requestingUserType,
      userId,
      'vitals',
      'read'
    );

    if (!hasPermission) {
      await logDataAccess(
        requestingUserId,
        requestingUserType,
        userId,
        'vitals',
        'read',
        false,
        ['report'],
        { reason: 'Insufficient permissions' }
      );
      return createErrorResponse(403, 'Forbidden: Insufficient permissions');
    }

    // Get user information
    const user = await getUser(userId);
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    const userName = `${user.profile.firstName} ${user.profile.lastName}`;

    // Calculate time range
    const timeRange = getTimeRangeForReportType(reportType);

    // Query vital signs data
    const vitalSignsData = await queryVitalSigns(userId, timeRange.start, timeRange.end);

    // Get medication data for the report period
    const medications = await getMedicationsByUser(userId);
    const periodMedications = medications.filter(
      med => med.scheduledTime >= timeRange.start && med.scheduledTime <= timeRange.end
    );

    // Calculate medication adherence
    let medicationSummary = '';
    let medicationAdherenceScore = 100;
    if (periodMedications.length > 0) {
      const takenCount = periodMedications.filter(med => med.status === 'taken').length;
      const missedCount = periodMedications.filter(med => med.status === 'missed').length;
      medicationAdherenceScore = Math.round((takenCount / periodMedications.length) * 100);

      medicationSummary = `
        <p><strong>Adherence Score:</strong> ${medicationAdherenceScore}%</p>
        <p><strong>Total Medications:</strong> ${periodMedications.length}</p>
        <p><strong>Taken:</strong> ${takenCount}</p>
        <p><strong>Missed:</strong> ${missedCount}</p>
        <p><strong>Status:</strong> ${medicationAdherenceScore >= 80 ? 'Good adherence' : 'Needs improvement'}</p>
      `;
    }

    // Group and analyze data
    const groupedData: Record<string, number[]> = {};
    for (const record of vitalSignsData) {
      const measureName = record.measure_name;
      if (!groupedData[measureName]) {
        groupedData[measureName] = [];
      }
      groupedData[measureName].push(parseFloat(record.value));
    }

    // Calculate statistics and trends
    const metricsData: Record<string, any> = {};
    const trends = [];

    for (const [metric, values] of Object.entries(groupedData)) {
      const stats = calculateStatistics(values);
      const trend = values.length >= 2 ? 'stable' : 'insufficient_data';

      metricsData[metric] = { ...stats, trend };

      trends.push({
        metric,
        timeRange,
        dataPoints: values.map((value, index) => ({
          timestamp: new Date(timeRange.start.getTime() + (index * (timeRange.end.getTime() - timeRange.start.getTime()) / values.length)),
          value,
          source: 'manual' as const,
        })),
        trend: trend as any,
        analysis: `${metric.replace(/_/g, ' ')}: Average ${stats.avg.toFixed(1)}, Range ${stats.min.toFixed(1)}-${stats.max.toFixed(1)}`,
      });
    }

    // Generate recommendations
    const recommendations = generateRecommendations(metricsData);

    // Add medication adherence to recommendations if needed
    if (medicationAdherenceScore < 80 && periodMedications.length > 0) {
      recommendations.push(`Medication adherence is ${medicationAdherenceScore}%. Consider setting more reminders or discussing barriers with your healthcare provider.`);
    }

    // Generate summary
    const summary = generateSummary(reportType, metricsData, recommendations);

    // Create report object
    const reportId = uuidv4();
    const report: HealthReport = {
      id: reportId,
      userId,
      reportType,
      generatedAt: new Date(),
      timeRange,
      summary,
      trends,
      recommendations,
    };

    // Generate PDF content with medication data
    const pdfContent = generatePDFContent(report, userName, medicationSummary);

    // Store report in S3 with encryption
    const s3Key = `reports/${userId}/${reportId}.html`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: REPORTS_BUCKET,
        Key: s3Key,
        Body: pdfContent,
        ContentType: 'text/html',
        ServerSideEncryption: 'AES256',
        Metadata: {
          userId,
          reportType,
          generatedAt: report.generatedAt.toISOString(),
        },
      })
    );

    // Generate export URL (presigned URL would be generated here in production)
    const exportUrl = `https://${REPORTS_BUCKET}.s3.amazonaws.com/${s3Key}`;
    report.exportUrl = exportUrl;

    // Log successful access
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      userId,
      'vitals',
      'read',
      true,
      ['report'],
      {
        reportType,
        reportId,
        metricsIncluded: Object.keys(metricsData),
      }
    );

    return createSuccessResponse({
      message: 'Health report generated successfully',
      report,
    });
  } catch (error) {
    console.error('Generate health report error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
