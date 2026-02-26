// Analyze Health Trends API Endpoint
// Requirements: 1.5, 10.1, 10.2, 10.5 - Generate health trends and visualizations

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, HealthTrend, TimeRange } from '../shared/types';
import { queryVitalSigns } from '../shared/timestream-client';
import { checkPermission } from '../shared/access-control';
import { logDataAccess } from '../shared/audit-logger';

/**
 * Calculate trend direction based on data points
 */
function calculateTrend(dataPoints: Array<{ timestamp: Date; value: number }>): 'improving' | 'stable' | 'declining' | 'concerning' {
  if (dataPoints.length < 2) {
    return 'stable';
  }

  // Calculate linear regression slope
  const n = dataPoints.length;
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map(dp => dp.value);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Calculate average and standard deviation
  const avg = sumY / n;
  const variance = yValues.reduce((sum, y) => sum + Math.pow(y - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Determine trend based on slope and variability
  const normalizedSlope = slope / (stdDev || 1);

  if (Math.abs(normalizedSlope) < 0.1) {
    return 'stable';
  } else if (normalizedSlope > 0.3) {
    return 'concerning';
  } else if (normalizedSlope > 0.1) {
    return 'declining';
  } else {
    return 'improving';
  }
}

/**
 * Generate analysis text based on trend
 */
function generateAnalysis(
  metric: string,
  trend: 'improving' | 'stable' | 'declining' | 'concerning',
  dataPoints: Array<{ timestamp: Date; value: number }>
): string {
  if (dataPoints.length === 0) {
    return `No ${metric} data available for this time period.`;
  }

  const latest = dataPoints[dataPoints.length - 1].value;
  const earliest = dataPoints[0].value;
  const avg = dataPoints.reduce((sum, dp) => sum + dp.value, 0) / dataPoints.length;

  const metricName = metric.replace(/_/g, ' ');

  switch (trend) {
    case 'improving':
      return `Your ${metricName} is showing improvement. Current: ${latest.toFixed(1)}, Average: ${avg.toFixed(1)}. Keep up the good work!`;
    case 'stable':
      return `Your ${metricName} is stable. Current: ${latest.toFixed(1)}, Average: ${avg.toFixed(1)}. Continue monitoring regularly.`;
    case 'declining':
      return `Your ${metricName} shows a declining trend. Current: ${latest.toFixed(1)}, Average: ${avg.toFixed(1)}. Consider discussing with your healthcare provider.`;
    case 'concerning':
      return `Your ${metricName} shows concerning changes. Current: ${latest.toFixed(1)}, Average: ${avg.toFixed(1)}. Please consult your healthcare provider soon.`;
  }
}

/**
 * Generate visualization data for charts
 */
function generateVisualizationData(dataPoints: Array<{ timestamp: Date; value: number }>) {
  return {
    labels: dataPoints.map(dp => dp.timestamp.toISOString()),
    values: dataPoints.map(dp => dp.value),
    chartType: 'line',
  };
}

/**
 * Analyze health trends for a user
 * GET /api/v1/health/trends/{userId}
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract user info from authorizer context
    const requestingUserId = event.requestContext.authorizer?.principalId;
    const requestingUserType = event.requestContext.authorizer?.userType as 'primary' | 'secondary';

    if (!requestingUserId || !requestingUserType) {
      return createErrorResponse(401, 'Unauthorized: Missing user context');
    }

    // Get target user ID from path parameters
    const targetUserId = event.pathParameters?.userId;

    if (!targetUserId) {
      return createErrorResponse(400, 'Missing userId parameter');
    }

    // Check permissions
    const hasPermission = await checkPermission(
      requestingUserId,
      requestingUserType,
      targetUserId,
      'vitals',
      'read'
    );

    if (!hasPermission) {
      await logDataAccess(
        requestingUserId,
        requestingUserType,
        targetUserId,
        'vitals',
        'read',
        false,
        ['trends'],
        { reason: 'Insufficient permissions' }
      );
      return createErrorResponse(403, 'Forbidden: Insufficient permissions');
    }

    // Parse time range from query parameters
    const timeRangeParam = event.queryStringParameters?.timeRange || '7d';
    const endTime = new Date();
    let startTime: Date;

    switch (timeRangeParam) {
      case '24h':
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startTime = new Date(endTime.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const timeRange: TimeRange = { start: startTime, end: endTime };

    // Query vital signs data
    const vitalSignsData = await queryVitalSigns(targetUserId, startTime, endTime);

    // Group data by measure name
    const groupedData: Record<string, Array<{ timestamp: Date; value: number; source: string }>> = {};

    for (const record of vitalSignsData) {
      const measureName = record.measure_name;
      if (!groupedData[measureName]) {
        groupedData[measureName] = [];
      }
      groupedData[measureName].push({
        timestamp: new Date(record.time),
        value: parseFloat(record.value),
        source: record.source,
      });
    }

    // Generate trends for each metric
    const trends: HealthTrend[] = [];
    const recommendations: string[] = [];

    for (const [metric, dataPoints] of Object.entries(groupedData)) {
      if (dataPoints.length === 0) continue;

      // Sort by timestamp
      dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const trend = calculateTrend(dataPoints);
      const analysis = generateAnalysis(metric, trend, dataPoints);

      trends.push({
        metric,
        timeRange,
        dataPoints: dataPoints.map(dp => ({
          timestamp: dp.timestamp,
          value: dp.value,
          source: dp.source as any,
        })),
        trend,
        analysis,
      });

      // Generate recommendations for concerning trends
      if (trend === 'concerning' || trend === 'declining') {
        recommendations.push(`Monitor ${metric.replace(/_/g, ' ')} closely and consult your healthcare provider.`);
      }
    }

    // Generate visualization data
    const visualizations = Object.entries(groupedData).map(([metric, dataPoints]) => ({
      metric,
      data: generateVisualizationData(dataPoints),
    }));

    // Log successful access
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      targetUserId,
      'vitals',
      'read',
      true,
      ['trends'],
      {
        timeRange: timeRangeParam,
        metricsAnalyzed: Object.keys(groupedData),
      }
    );

    return createSuccessResponse({
      userId: targetUserId,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
      trends,
      visualizations,
      recommendations,
      summary: `Analyzed ${trends.length} health metrics over ${timeRangeParam}`,
    });
  } catch (error) {
    console.error('Analyze health trends error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
