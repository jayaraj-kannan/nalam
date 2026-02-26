"use strict";
// Generate Health Report Lambda Function
// Requirements: 10.1, 10.3, 10.4 - Generate PDF reports with health trends
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_s3_1 = require("@aws-sdk/client-s3");
const types_1 = require("../shared/types");
const timestream_client_1 = require("../shared/timestream-client");
const access_control_1 = require("../shared/access-control");
const audit_logger_1 = require("../shared/audit-logger");
const users_1 = require("../shared/data-access/users");
const medications_1 = require("../shared/data-access/medications");
const uuid_1 = require("uuid");
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const REPORTS_BUCKET = process.env.REPORTS_BUCKET || 'healthcare-reports-dev';
/**
 * Calculate time range based on report type
 */
function getTimeRangeForReportType(reportType) {
    const endTime = new Date();
    let startTime;
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
function calculateStatistics(values) {
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
function generateSummary(reportType, metricsData, recommendations) {
    const period = reportType === 'weekly' ? 'week' : reportType === 'monthly' ? 'month' : reportType === 'quarterly' ? 'quarter' : 'year';
    const metricsCount = Object.keys(metricsData).length;
    let summary = `Health Report for the past ${period}. `;
    summary += `Analyzed ${metricsCount} health metrics. `;
    if (recommendations.length > 0) {
        summary += `${recommendations.length} recommendations provided. `;
    }
    else {
        summary += 'All metrics within normal ranges. ';
    }
    return summary;
}
/**
 * Generate recommendations based on health data
 */
function generateRecommendations(metricsData) {
    const recommendations = [];
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
function generatePDFContent(report, userName, medicationSummary) {
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
async function handler(event) {
    try {
        // Extract user info from authorizer context
        const requestingUserId = event.requestContext.authorizer?.principalId;
        const requestingUserType = event.requestContext.authorizer?.userType;
        if (!requestingUserId || !requestingUserType) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized: Missing user context');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Missing request body');
        }
        const body = JSON.parse(event.body);
        const { userId, reportType } = body;
        if (!userId || !reportType) {
            return (0, types_1.createErrorResponse)(400, 'Missing userId or reportType');
        }
        // Validate report type
        const validReportTypes = ['weekly', 'monthly', 'quarterly', 'annual'];
        if (!validReportTypes.includes(reportType)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid report type');
        }
        // Check permissions
        const hasPermission = await (0, access_control_1.checkPermission)(requestingUserId, requestingUserType, userId, 'vitals', 'read');
        if (!hasPermission) {
            await (0, audit_logger_1.logDataAccess)(requestingUserId, requestingUserType, userId, 'vitals', 'read', false, ['report'], { reason: 'Insufficient permissions' });
            return (0, types_1.createErrorResponse)(403, 'Forbidden: Insufficient permissions');
        }
        // Get user information
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        const userName = `${user.profile.firstName} ${user.profile.lastName}`;
        // Calculate time range
        const timeRange = getTimeRangeForReportType(reportType);
        // Query vital signs data
        const vitalSignsData = await (0, timestream_client_1.queryVitalSigns)(userId, timeRange.start, timeRange.end);
        // Get medication data for the report period
        const medications = await (0, medications_1.getMedicationsByUser)(userId);
        const periodMedications = medications.filter(med => med.scheduledTime >= timeRange.start && med.scheduledTime <= timeRange.end);
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
        const groupedData = {};
        for (const record of vitalSignsData) {
            const measureName = record.measure_name;
            if (!groupedData[measureName]) {
                groupedData[measureName] = [];
            }
            groupedData[measureName].push(parseFloat(record.value));
        }
        // Calculate statistics and trends
        const metricsData = {};
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
                    source: 'manual',
                })),
                trend: trend,
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
        const reportId = (0, uuid_1.v4)();
        const report = {
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
        await s3Client.send(new client_s3_1.PutObjectCommand({
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
        }));
        // Generate export URL (presigned URL would be generated here in production)
        const exportUrl = `https://${REPORTS_BUCKET}.s3.amazonaws.com/${s3Key}`;
        report.exportUrl = exportUrl;
        // Log successful access
        await (0, audit_logger_1.logDataAccess)(requestingUserId, requestingUserType, userId, 'vitals', 'read', true, ['report'], {
            reportType,
            reportId,
            metricsIncluded: Object.keys(metricsData),
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Health report generated successfully',
            report,
        });
    }
    catch (error) {
        console.error('Generate health report error:', error);
        return (0, types_1.createErrorResponse)(500, 'Internal server error');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaGVhbHRoLXJlcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlbmVyYXRlLWhlYWx0aC1yZXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHlDQUF5QztBQUN6QywyRUFBMkU7O0FBaUwzRSwwQkFpTUM7QUEvV0Qsa0RBQWdFO0FBQ2hFLDJDQUFrSDtBQUNsSCxtRUFBOEQ7QUFDOUQsNkRBQTJEO0FBQzNELHlEQUF1RDtBQUN2RCx1REFBc0Q7QUFDdEQsbUVBQXlFO0FBQ3pFLCtCQUFvQztBQUVwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSx3QkFBd0IsQ0FBQztBQUU5RTs7R0FFRztBQUNILFNBQVMseUJBQXlCLENBQUMsVUFBc0I7SUFDdkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUMzQixJQUFJLFNBQWUsQ0FBQztJQUVwQixRQUFRLFVBQVUsRUFBRSxDQUFDO1FBQ25CLEtBQUssUUFBUTtZQUNYLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2xFLE1BQU07UUFDUixLQUFLLFNBQVM7WUFDWixTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNuRSxNQUFNO1FBQ1IsS0FBSyxXQUFXO1lBQ2QsU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVB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QyxNQUFNO1NBQ1AsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUMzRCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEdlbmVyYXRlIEhlYWx0aCBSZXBvcnQgTGFtYmRhIEZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDEwLjEsIDEwLjMsIDEwLjQgLSBHZW5lcmF0ZSBQREYgcmVwb3J0cyB3aXRoIGhlYWx0aCB0cmVuZHNcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgUzNDbGllbnQsIFB1dE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBSZXBvcnRUeXBlLCBIZWFsdGhSZXBvcnQsIFRpbWVSYW5nZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBxdWVyeVZpdGFsU2lnbnMgfSBmcm9tICcuLi9zaGFyZWQvdGltZXN0cmVhbS1jbGllbnQnO1xuaW1wb3J0IHsgY2hlY2tQZXJtaXNzaW9uIH0gZnJvbSAnLi4vc2hhcmVkL2FjY2Vzcy1jb250cm9sJztcbmltcG9ydCB7IGxvZ0RhdGFBY2Nlc3MgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcbmltcG9ydCB7IGdldFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnO1xuaW1wb3J0IHsgZ2V0TWVkaWNhdGlvbnNCeVVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XG5cbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xuY29uc3QgUkVQT1JUU19CVUNLRVQgPSBwcm9jZXNzLmVudi5SRVBPUlRTX0JVQ0tFVCB8fCAnaGVhbHRoY2FyZS1yZXBvcnRzLWRldic7XG5cbi8qKlxuICogQ2FsY3VsYXRlIHRpbWUgcmFuZ2UgYmFzZWQgb24gcmVwb3J0IHR5cGVcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZVJhbmdlRm9yUmVwb3J0VHlwZShyZXBvcnRUeXBlOiBSZXBvcnRUeXBlKTogVGltZVJhbmdlIHtcbiAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKCk7XG4gIGxldCBzdGFydFRpbWU6IERhdGU7XG5cbiAgc3dpdGNoIChyZXBvcnRUeXBlKSB7XG4gICAgY2FzZSAnd2Vla2x5JzpcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKGVuZFRpbWUuZ2V0VGltZSgpIC0gNyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbW9udGhseSc6XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZShlbmRUaW1lLmdldFRpbWUoKSAtIDMwICogMjQgKiA2MCAqIDYwICogMTAwMCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdxdWFydGVybHknOlxuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoZW5kVGltZS5nZXRUaW1lKCkgLSA5MCAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYW5udWFsJzpcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKGVuZFRpbWUuZ2V0VGltZSgpIC0gMzY1ICogMjQgKiA2MCAqIDYwICogMTAwMCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoZW5kVGltZS5nZXRUaW1lKCkgLSAzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICB9XG5cbiAgcmV0dXJuIHsgc3RhcnQ6IHN0YXJ0VGltZSwgZW5kOiBlbmRUaW1lIH07XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlIHN0YXRpc3RpY3MgZm9yIGEgbWV0cmljXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVN0YXRpc3RpY3ModmFsdWVzOiBudW1iZXJbXSkge1xuICBpZiAodmFsdWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7IG1pbjogMCwgbWF4OiAwLCBhdmc6IDAsIGxhdGVzdDogMCB9O1xuICB9XG5cbiAgY29uc3QgbWluID0gTWF0aC5taW4oLi4udmFsdWVzKTtcbiAgY29uc3QgbWF4ID0gTWF0aC5tYXgoLi4udmFsdWVzKTtcbiAgY29uc3QgYXZnID0gdmFsdWVzLnJlZHVjZSgoc3VtLCB2YWwpID0+IHN1bSArIHZhbCwgMCkgLyB2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCBsYXRlc3QgPSB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdO1xuXG4gIHJldHVybiB7IG1pbiwgbWF4LCBhdmcsIGxhdGVzdCB9O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIHN1bW1hcnkgdGV4dCBmb3IgdGhlIHJlcG9ydFxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkoXG4gIHJlcG9ydFR5cGU6IFJlcG9ydFR5cGUsXG4gIG1ldHJpY3NEYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICByZWNvbW1lbmRhdGlvbnM6IHN0cmluZ1tdXG4pOiBzdHJpbmcge1xuICBjb25zdCBwZXJpb2QgPSByZXBvcnRUeXBlID09PSAnd2Vla2x5JyA/ICd3ZWVrJyA6IHJlcG9ydFR5cGUgPT09ICdtb250aGx5JyA/ICdtb250aCcgOiByZXBvcnRUeXBlID09PSAncXVhcnRlcmx5JyA/ICdxdWFydGVyJyA6ICd5ZWFyJztcbiAgY29uc3QgbWV0cmljc0NvdW50ID0gT2JqZWN0LmtleXMobWV0cmljc0RhdGEpLmxlbmd0aDtcblxuICBsZXQgc3VtbWFyeSA9IGBIZWFsdGggUmVwb3J0IGZvciB0aGUgcGFzdCAke3BlcmlvZH0uIGA7XG4gIHN1bW1hcnkgKz0gYEFuYWx5emVkICR7bWV0cmljc0NvdW50fSBoZWFsdGggbWV0cmljcy4gYDtcblxuICBpZiAocmVjb21tZW5kYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICBzdW1tYXJ5ICs9IGAke3JlY29tbWVuZGF0aW9ucy5sZW5ndGh9IHJlY29tbWVuZGF0aW9ucyBwcm92aWRlZC4gYDtcbiAgfSBlbHNlIHtcbiAgICBzdW1tYXJ5ICs9ICdBbGwgbWV0cmljcyB3aXRoaW4gbm9ybWFsIHJhbmdlcy4gJztcbiAgfVxuXG4gIHJldHVybiBzdW1tYXJ5O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIHJlY29tbWVuZGF0aW9ucyBiYXNlZCBvbiBoZWFsdGggZGF0YVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVJlY29tbWVuZGF0aW9ucyhtZXRyaWNzRGF0YTogUmVjb3JkPHN0cmluZywgYW55Pik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVjb21tZW5kYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW21ldHJpYywgZGF0YV0gb2YgT2JqZWN0LmVudHJpZXMobWV0cmljc0RhdGEpKSB7XG4gICAgY29uc3QgeyBhdmcsIGxhdGVzdCwgdHJlbmQgfSA9IGRhdGE7XG5cbiAgICBpZiAodHJlbmQgPT09ICdjb25jZXJuaW5nJyB8fCB0cmVuZCA9PT0gJ2RlY2xpbmluZycpIHtcbiAgICAgIGNvbnN0IG1ldHJpY05hbWUgPSBtZXRyaWMucmVwbGFjZSgvXy9nLCAnICcpO1xuICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goYE1vbml0b3IgJHttZXRyaWNOYW1lfSBjbG9zZWx5LiBDdXJyZW50IGF2ZXJhZ2U6ICR7YXZnLnRvRml4ZWQoMSl9LiBDb25zaWRlciBjb25zdWx0aW5nIHlvdXIgaGVhbHRoY2FyZSBwcm92aWRlci5gKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgZ2VuZXJhbCByZWNvbW1lbmRhdGlvbnNcbiAgaWYgKHJlY29tbWVuZGF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICByZWNvbW1lbmRhdGlvbnMucHVzaCgnQ29udGludWUgbW9uaXRvcmluZyB5b3VyIGhlYWx0aCByZWd1bGFybHkuJyk7XG4gICAgcmVjb21tZW5kYXRpb25zLnB1c2goJ01haW50YWluIGEgaGVhbHRoeSBsaWZlc3R5bGUgd2l0aCByZWd1bGFyIGV4ZXJjaXNlIGFuZCBiYWxhbmNlZCBkaWV0LicpO1xuICB9XG5cbiAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucztcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBQREYgY29udGVudCAoc2ltcGxpZmllZCBIVE1MIGZvcm1hdCBmb3Igbm93KVxuICogSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCB1c2UgYSBQREYgZ2VuZXJhdGlvbiBsaWJyYXJ5IGxpa2UgUERGS2l0IG9yIFB1cHBldGVlclxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVBERkNvbnRlbnQocmVwb3J0OiBIZWFsdGhSZXBvcnQsIHVzZXJOYW1lOiBzdHJpbmcsIG1lZGljYXRpb25TdW1tYXJ5Pzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgaHRtbCA9IGBcbjwhRE9DVFlQRSBodG1sPlxuPGh0bWw+XG48aGVhZD5cbiAgPHRpdGxlPkhlYWx0aCBSZXBvcnQgLSAke3JlcG9ydC5yZXBvcnRUeXBlfTwvdGl0bGU+XG4gIDxzdHlsZT5cbiAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBtYXJnaW46IDQwcHg7IH1cbiAgICBoMSB7IGNvbG9yOiAjMmMzZTUwOyB9XG4gICAgaDIgeyBjb2xvcjogIzM0NDk1ZTsgbWFyZ2luLXRvcDogMzBweDsgfVxuICAgIC5oZWFkZXIgeyBib3JkZXItYm90dG9tOiAycHggc29saWQgIzM0OThkYjsgcGFkZGluZy1ib3R0b206IDIwcHg7IH1cbiAgICAubWV0cmljIHsgbWFyZ2luOiAyMHB4IDA7IHBhZGRpbmc6IDE1cHg7IGJhY2tncm91bmQ6ICNmOGY5ZmE7IGJvcmRlci1sZWZ0OiA0cHggc29saWQgIzM0OThkYjsgfVxuICAgIC5yZWNvbW1lbmRhdGlvbiB7IG1hcmdpbjogMTBweCAwOyBwYWRkaW5nOiAxMHB4OyBiYWNrZ3JvdW5kOiAjZmZmM2NkOyBib3JkZXItbGVmdDogNHB4IHNvbGlkICNmZmMxMDc7IH1cbiAgICAubWVkaWNhdGlvbi1zZWN0aW9uIHsgbWFyZ2luOiAyMHB4IDA7IHBhZGRpbmc6IDE1cHg7IGJhY2tncm91bmQ6ICNlOGY1ZTk7IGJvcmRlci1sZWZ0OiA0cHggc29saWQgIzRjYWY1MDsgfVxuICAgIC5mb290ZXIgeyBtYXJnaW4tdG9wOiA0MHB4OyBwYWRkaW5nLXRvcDogMjBweDsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNkZGQ7IGZvbnQtc2l6ZTogMTJweDsgY29sb3I6ICM2NjY7IH1cbiAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgPGgxPkhlYWx0aCBSZXBvcnQ8L2gxPlxuICAgIDxwPjxzdHJvbmc+UGF0aWVudDo8L3N0cm9uZz4gJHt1c2VyTmFtZX08L3A+XG4gICAgPHA+PHN0cm9uZz5SZXBvcnQgVHlwZTo8L3N0cm9uZz4gJHtyZXBvcnQucmVwb3J0VHlwZX08L3A+XG4gICAgPHA+PHN0cm9uZz5QZXJpb2Q6PC9zdHJvbmc+ICR7bmV3IERhdGUocmVwb3J0LnRpbWVSYW5nZS5zdGFydCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9IC0gJHtuZXcgRGF0ZShyZXBvcnQudGltZVJhbmdlLmVuZCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9PC9wPlxuICAgIDxwPjxzdHJvbmc+R2VuZXJhdGVkOjwvc3Ryb25nPiAke25ldyBEYXRlKHJlcG9ydC5nZW5lcmF0ZWRBdCkudG9Mb2NhbGVTdHJpbmcoKX08L3A+XG4gIDwvZGl2PlxuXG4gIDxoMj5TdW1tYXJ5PC9oMj5cbiAgPHA+JHtyZXBvcnQuc3VtbWFyeX08L3A+XG5cbiAgJHttZWRpY2F0aW9uU3VtbWFyeSA/IGBcbiAgPGgyPk1lZGljYXRpb24gQWRoZXJlbmNlPC9oMj5cbiAgPGRpdiBjbGFzcz1cIm1lZGljYXRpb24tc2VjdGlvblwiPlxuICAgICR7bWVkaWNhdGlvblN1bW1hcnl9XG4gIDwvZGl2PlxuICBgIDogJyd9XG5cbiAgPGgyPkhlYWx0aCBUcmVuZHM8L2gyPlxuICAke3JlcG9ydC50cmVuZHMubWFwKHRyZW5kID0+IGBcbiAgICA8ZGl2IGNsYXNzPVwibWV0cmljXCI+XG4gICAgICA8aDM+JHt0cmVuZC5tZXRyaWMucmVwbGFjZSgvXy9nLCAnICcpLnRvVXBwZXJDYXNlKCl9PC9oMz5cbiAgICAgIDxwPjxzdHJvbmc+VHJlbmQ6PC9zdHJvbmc+ICR7dHJlbmQudHJlbmR9PC9wPlxuICAgICAgPHA+PHN0cm9uZz5BbmFseXNpczo8L3N0cm9uZz4gJHt0cmVuZC5hbmFseXNpc308L3A+XG4gICAgICA8cD48c3Ryb25nPkRhdGEgUG9pbnRzOjwvc3Ryb25nPiAke3RyZW5kLmRhdGFQb2ludHMubGVuZ3RofTwvcD5cbiAgICA8L2Rpdj5cbiAgYCkuam9pbignJyl9XG5cbiAgPGgyPlJlY29tbWVuZGF0aW9uczwvaDI+XG4gICR7cmVwb3J0LnJlY29tbWVuZGF0aW9ucy5tYXAocmVjID0+IGBcbiAgICA8ZGl2IGNsYXNzPVwicmVjb21tZW5kYXRpb25cIj5cbiAgICAgIDxwPiR7cmVjfTwvcD5cbiAgICA8L2Rpdj5cbiAgYCkuam9pbignJyl9XG5cbiAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxuICAgIDxwPlRoaXMgcmVwb3J0IGlzIGZvciBpbmZvcm1hdGlvbmFsIHB1cnBvc2VzIG9ubHkgYW5kIHNob3VsZCBub3QgcmVwbGFjZSBwcm9mZXNzaW9uYWwgbWVkaWNhbCBhZHZpY2UuPC9wPlxuICAgIDxwPlJlcG9ydCBJRDogJHtyZXBvcnQuaWR9PC9wPlxuICA8L2Rpdj5cbjwvYm9keT5cbjwvaHRtbD5cbiAgYDtcblxuICByZXR1cm4gaHRtbDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBoZWFsdGggcmVwb3J0XG4gKiBQT1NUIC9hcGkvdjEvaGVhbHRoL3JlcG9ydHMvZ2VuZXJhdGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBFeHRyYWN0IHVzZXIgaW5mbyBmcm9tIGF1dGhvcml6ZXIgY29udGV4dFxuICAgIGNvbnN0IHJlcXVlc3RpbmdVc2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy5wcmluY2lwYWxJZDtcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlclR5cGUgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy51c2VyVHlwZSBhcyAncHJpbWFyeScgfCAnc2Vjb25kYXJ5JztcblxuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCB8fCAhcmVxdWVzdGluZ1VzZXJUeXBlKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQ6IE1pc3NpbmcgdXNlciBjb250ZXh0Jyk7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNaXNzaW5nIHJlcXVlc3QgYm9keScpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuICAgIGNvbnN0IHsgdXNlcklkLCByZXBvcnRUeXBlIH0gPSBib2R5O1xuXG4gICAgaWYgKCF1c2VySWQgfHwgIXJlcG9ydFR5cGUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgdXNlcklkIG9yIHJlcG9ydFR5cGUnKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSByZXBvcnQgdHlwZVxuICAgIGNvbnN0IHZhbGlkUmVwb3J0VHlwZXM6IFJlcG9ydFR5cGVbXSA9IFsnd2Vla2x5JywgJ21vbnRobHknLCAncXVhcnRlcmx5JywgJ2FubnVhbCddO1xuICAgIGlmICghdmFsaWRSZXBvcnRUeXBlcy5pbmNsdWRlcyhyZXBvcnRUeXBlKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnSW52YWxpZCByZXBvcnQgdHlwZScpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHBlcm1pc3Npb25zXG4gICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihcbiAgICAgIHJlcXVlc3RpbmdVc2VySWQsXG4gICAgICByZXF1ZXN0aW5nVXNlclR5cGUsXG4gICAgICB1c2VySWQsXG4gICAgICAndml0YWxzJyxcbiAgICAgICdyZWFkJ1xuICAgICk7XG5cbiAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcbiAgICAgIGF3YWl0IGxvZ0RhdGFBY2Nlc3MoXG4gICAgICAgIHJlcXVlc3RpbmdVc2VySWQsXG4gICAgICAgIHJlcXVlc3RpbmdVc2VyVHlwZSxcbiAgICAgICAgdXNlcklkLFxuICAgICAgICAndml0YWxzJyxcbiAgICAgICAgJ3JlYWQnLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgWydyZXBvcnQnXSxcbiAgICAgICAgeyByZWFzb246ICdJbnN1ZmZpY2llbnQgcGVybWlzc2lvbnMnIH1cbiAgICAgICk7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdGb3JiaWRkZW46IEluc3VmZmljaWVudCBwZXJtaXNzaW9ucycpO1xuICAgIH1cblxuICAgIC8vIEdldCB1c2VyIGluZm9ybWF0aW9uXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXIodXNlcklkKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlck5hbWUgPSBgJHt1c2VyLnByb2ZpbGUuZmlyc3ROYW1lfSAke3VzZXIucHJvZmlsZS5sYXN0TmFtZX1gO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRpbWUgcmFuZ2VcbiAgICBjb25zdCB0aW1lUmFuZ2UgPSBnZXRUaW1lUmFuZ2VGb3JSZXBvcnRUeXBlKHJlcG9ydFR5cGUpO1xuXG4gICAgLy8gUXVlcnkgdml0YWwgc2lnbnMgZGF0YVxuICAgIGNvbnN0IHZpdGFsU2lnbnNEYXRhID0gYXdhaXQgcXVlcnlWaXRhbFNpZ25zKHVzZXJJZCwgdGltZVJhbmdlLnN0YXJ0LCB0aW1lUmFuZ2UuZW5kKTtcblxuICAgIC8vIEdldCBtZWRpY2F0aW9uIGRhdGEgZm9yIHRoZSByZXBvcnQgcGVyaW9kXG4gICAgY29uc3QgbWVkaWNhdGlvbnMgPSBhd2FpdCBnZXRNZWRpY2F0aW9uc0J5VXNlcih1c2VySWQpO1xuICAgIGNvbnN0IHBlcmlvZE1lZGljYXRpb25zID0gbWVkaWNhdGlvbnMuZmlsdGVyKFxuICAgICAgbWVkID0+IG1lZC5zY2hlZHVsZWRUaW1lID49IHRpbWVSYW5nZS5zdGFydCAmJiBtZWQuc2NoZWR1bGVkVGltZSA8PSB0aW1lUmFuZ2UuZW5kXG4gICAgKTtcblxuICAgIC8vIENhbGN1bGF0ZSBtZWRpY2F0aW9uIGFkaGVyZW5jZVxuICAgIGxldCBtZWRpY2F0aW9uU3VtbWFyeSA9ICcnO1xuICAgIGxldCBtZWRpY2F0aW9uQWRoZXJlbmNlU2NvcmUgPSAxMDA7XG4gICAgaWYgKHBlcmlvZE1lZGljYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRha2VuQ291bnQgPSBwZXJpb2RNZWRpY2F0aW9ucy5maWx0ZXIobWVkID0+IG1lZC5zdGF0dXMgPT09ICd0YWtlbicpLmxlbmd0aDtcbiAgICAgIGNvbnN0IG1pc3NlZENvdW50ID0gcGVyaW9kTWVkaWNhdGlvbnMuZmlsdGVyKG1lZCA9PiBtZWQuc3RhdHVzID09PSAnbWlzc2VkJykubGVuZ3RoO1xuICAgICAgbWVkaWNhdGlvbkFkaGVyZW5jZVNjb3JlID0gTWF0aC5yb3VuZCgodGFrZW5Db3VudCAvIHBlcmlvZE1lZGljYXRpb25zLmxlbmd0aCkgKiAxMDApO1xuXG4gICAgICBtZWRpY2F0aW9uU3VtbWFyeSA9IGBcbiAgICAgICAgPHA+PHN0cm9uZz5BZGhlcmVuY2UgU2NvcmU6PC9zdHJvbmc+ICR7bWVkaWNhdGlvbkFkaGVyZW5jZVNjb3JlfSU8L3A+XG4gICAgICAgIDxwPjxzdHJvbmc+VG90YWwgTWVkaWNhdGlvbnM6PC9zdHJvbmc+ICR7cGVyaW9kTWVkaWNhdGlvbnMubGVuZ3RofTwvcD5cbiAgICAgICAgPHA+PHN0cm9uZz5UYWtlbjo8L3N0cm9uZz4gJHt0YWtlbkNvdW50fTwvcD5cbiAgICAgICAgPHA+PHN0cm9uZz5NaXNzZWQ6PC9zdHJvbmc+ICR7bWlzc2VkQ291bnR9PC9wPlxuICAgICAgICA8cD48c3Ryb25nPlN0YXR1czo8L3N0cm9uZz4gJHttZWRpY2F0aW9uQWRoZXJlbmNlU2NvcmUgPj0gODAgPyAnR29vZCBhZGhlcmVuY2UnIDogJ05lZWRzIGltcHJvdmVtZW50J308L3A+XG4gICAgICBgO1xuICAgIH1cblxuICAgIC8vIEdyb3VwIGFuZCBhbmFseXplIGRhdGFcbiAgICBjb25zdCBncm91cGVkRGF0YTogUmVjb3JkPHN0cmluZywgbnVtYmVyW10+ID0ge307XG4gICAgZm9yIChjb25zdCByZWNvcmQgb2Ygdml0YWxTaWduc0RhdGEpIHtcbiAgICAgIGNvbnN0IG1lYXN1cmVOYW1lID0gcmVjb3JkLm1lYXN1cmVfbmFtZTtcbiAgICAgIGlmICghZ3JvdXBlZERhdGFbbWVhc3VyZU5hbWVdKSB7XG4gICAgICAgIGdyb3VwZWREYXRhW21lYXN1cmVOYW1lXSA9IFtdO1xuICAgICAgfVxuICAgICAgZ3JvdXBlZERhdGFbbWVhc3VyZU5hbWVdLnB1c2gocGFyc2VGbG9hdChyZWNvcmQudmFsdWUpKTtcbiAgICB9XG5cbiAgICAvLyBDYWxjdWxhdGUgc3RhdGlzdGljcyBhbmQgdHJlbmRzXG4gICAgY29uc3QgbWV0cmljc0RhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICBjb25zdCB0cmVuZHMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgW21ldHJpYywgdmFsdWVzXSBvZiBPYmplY3QuZW50cmllcyhncm91cGVkRGF0YSkpIHtcbiAgICAgIGNvbnN0IHN0YXRzID0gY2FsY3VsYXRlU3RhdGlzdGljcyh2YWx1ZXMpO1xuICAgICAgY29uc3QgdHJlbmQgPSB2YWx1ZXMubGVuZ3RoID49IDIgPyAnc3RhYmxlJyA6ICdpbnN1ZmZpY2llbnRfZGF0YSc7XG5cbiAgICAgIG1ldHJpY3NEYXRhW21ldHJpY10gPSB7IC4uLnN0YXRzLCB0cmVuZCB9O1xuXG4gICAgICB0cmVuZHMucHVzaCh7XG4gICAgICAgIG1ldHJpYyxcbiAgICAgICAgdGltZVJhbmdlLFxuICAgICAgICBkYXRhUG9pbnRzOiB2YWx1ZXMubWFwKCh2YWx1ZSwgaW5kZXgpID0+ICh7XG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSh0aW1lUmFuZ2Uuc3RhcnQuZ2V0VGltZSgpICsgKGluZGV4ICogKHRpbWVSYW5nZS5lbmQuZ2V0VGltZSgpIC0gdGltZVJhbmdlLnN0YXJ0LmdldFRpbWUoKSkgLyB2YWx1ZXMubGVuZ3RoKSksXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgc291cmNlOiAnbWFudWFsJyBhcyBjb25zdCxcbiAgICAgICAgfSkpLFxuICAgICAgICB0cmVuZDogdHJlbmQgYXMgYW55LFxuICAgICAgICBhbmFseXNpczogYCR7bWV0cmljLnJlcGxhY2UoL18vZywgJyAnKX06IEF2ZXJhZ2UgJHtzdGF0cy5hdmcudG9GaXhlZCgxKX0sIFJhbmdlICR7c3RhdHMubWluLnRvRml4ZWQoMSl9LSR7c3RhdHMubWF4LnRvRml4ZWQoMSl9YCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIHJlY29tbWVuZGF0aW9uc1xuICAgIGNvbnN0IHJlY29tbWVuZGF0aW9ucyA9IGdlbmVyYXRlUmVjb21tZW5kYXRpb25zKG1ldHJpY3NEYXRhKTtcblxuICAgIC8vIEFkZCBtZWRpY2F0aW9uIGFkaGVyZW5jZSB0byByZWNvbW1lbmRhdGlvbnMgaWYgbmVlZGVkXG4gICAgaWYgKG1lZGljYXRpb25BZGhlcmVuY2VTY29yZSA8IDgwICYmIHBlcmlvZE1lZGljYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKGBNZWRpY2F0aW9uIGFkaGVyZW5jZSBpcyAke21lZGljYXRpb25BZGhlcmVuY2VTY29yZX0lLiBDb25zaWRlciBzZXR0aW5nIG1vcmUgcmVtaW5kZXJzIG9yIGRpc2N1c3NpbmcgYmFycmllcnMgd2l0aCB5b3VyIGhlYWx0aGNhcmUgcHJvdmlkZXIuYCk7XG4gICAgfVxuXG4gICAgLy8gR2VuZXJhdGUgc3VtbWFyeVxuICAgIGNvbnN0IHN1bW1hcnkgPSBnZW5lcmF0ZVN1bW1hcnkocmVwb3J0VHlwZSwgbWV0cmljc0RhdGEsIHJlY29tbWVuZGF0aW9ucyk7XG5cbiAgICAvLyBDcmVhdGUgcmVwb3J0IG9iamVjdFxuICAgIGNvbnN0IHJlcG9ydElkID0gdXVpZHY0KCk7XG4gICAgY29uc3QgcmVwb3J0OiBIZWFsdGhSZXBvcnQgPSB7XG4gICAgICBpZDogcmVwb3J0SWQsXG4gICAgICB1c2VySWQsXG4gICAgICByZXBvcnRUeXBlLFxuICAgICAgZ2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCksXG4gICAgICB0aW1lUmFuZ2UsXG4gICAgICBzdW1tYXJ5LFxuICAgICAgdHJlbmRzLFxuICAgICAgcmVjb21tZW5kYXRpb25zLFxuICAgIH07XG5cbiAgICAvLyBHZW5lcmF0ZSBQREYgY29udGVudCB3aXRoIG1lZGljYXRpb24gZGF0YVxuICAgIGNvbnN0IHBkZkNvbnRlbnQgPSBnZW5lcmF0ZVBERkNvbnRlbnQocmVwb3J0LCB1c2VyTmFtZSwgbWVkaWNhdGlvblN1bW1hcnkpO1xuXG4gICAgLy8gU3RvcmUgcmVwb3J0IGluIFMzIHdpdGggZW5jcnlwdGlvblxuICAgIGNvbnN0IHMzS2V5ID0gYHJlcG9ydHMvJHt1c2VySWR9LyR7cmVwb3J0SWR9Lmh0bWxgO1xuICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQoXG4gICAgICBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XG4gICAgICAgIEJ1Y2tldDogUkVQT1JUU19CVUNLRVQsXG4gICAgICAgIEtleTogczNLZXksXG4gICAgICAgIEJvZHk6IHBkZkNvbnRlbnQsXG4gICAgICAgIENvbnRlbnRUeXBlOiAndGV4dC9odG1sJyxcbiAgICAgICAgU2VydmVyU2lkZUVuY3J5cHRpb246ICdBRVMyNTYnLFxuICAgICAgICBNZXRhZGF0YToge1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICByZXBvcnRUeXBlLFxuICAgICAgICAgIGdlbmVyYXRlZEF0OiByZXBvcnQuZ2VuZXJhdGVkQXQudG9JU09TdHJpbmcoKSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEdlbmVyYXRlIGV4cG9ydCBVUkwgKHByZXNpZ25lZCBVUkwgd291bGQgYmUgZ2VuZXJhdGVkIGhlcmUgaW4gcHJvZHVjdGlvbilcbiAgICBjb25zdCBleHBvcnRVcmwgPSBgaHR0cHM6Ly8ke1JFUE9SVFNfQlVDS0VUfS5zMy5hbWF6b25hd3MuY29tLyR7czNLZXl9YDtcbiAgICByZXBvcnQuZXhwb3J0VXJsID0gZXhwb3J0VXJsO1xuXG4gICAgLy8gTG9nIHN1Y2Nlc3NmdWwgYWNjZXNzXG4gICAgYXdhaXQgbG9nRGF0YUFjY2VzcyhcbiAgICAgIHJlcXVlc3RpbmdVc2VySWQsXG4gICAgICByZXF1ZXN0aW5nVXNlclR5cGUsXG4gICAgICB1c2VySWQsXG4gICAgICAndml0YWxzJyxcbiAgICAgICdyZWFkJyxcbiAgICAgIHRydWUsXG4gICAgICBbJ3JlcG9ydCddLFxuICAgICAge1xuICAgICAgICByZXBvcnRUeXBlLFxuICAgICAgICByZXBvcnRJZCxcbiAgICAgICAgbWV0cmljc0luY2x1ZGVkOiBPYmplY3Qua2V5cyhtZXRyaWNzRGF0YSksXG4gICAgICB9XG4gICAgKTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0hlYWx0aCByZXBvcnQgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICByZXBvcnQsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2VuZXJhdGUgaGVhbHRoIHJlcG9ydCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XG4gIH1cbn1cbiJdfQ==