import React, { useState, useEffect } from 'react';
import { Button, Text } from '../../accessible';
import { HealthReport, ReportType, HealthTrend } from '../../../types';
import './HealthReportsWidget.css';

export interface HealthReportsWidgetProps {
  primaryUserId: string;
}

interface TrendVisualizationProps {
  trend: HealthTrend;
}

/**
 * Simple trend visualization component
 * Shows a sparkline-style chart for health trends
 */
const TrendVisualization: React.FC<TrendVisualizationProps> = ({ trend }) => {
  const values = trend.dataPoints.map(dp => dp.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Normalize values to 0-100 scale for visualization
  const normalizedPoints = values.map(v => ((v - min) / range) * 100);

  // Create SVG path for sparkline
  const width = 200;
  const height = 60;
  const padding = 5;
  const stepX = (width - 2 * padding) / (values.length - 1 || 1);

  const pathData = normalizedPoints
    .map((y, i) => {
      const x = padding + i * stepX;
      const yPos = height - padding - (y / 100) * (height - 2 * padding);
      return `${i === 0 ? 'M' : 'L'} ${x} ${yPos}`;
    })
    .join(' ');

  // Determine trend color based on trend status
  const getTrendColor = () => {
    switch (trend.trend) {
      case 'improving': return '#10b981'; // green
      case 'stable': return '#3b82f6'; // blue
      case 'declining': return '#f59e0b'; // amber
      case 'concerning': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getTrendIcon = () => {
    switch (trend.trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
      case 'concerning': return '⚠️';
      default: return '📊';
    }
  };

  return (
    <div className="trend-visualization">
      <div className="trend-visualization__header">
        <div className="trend-visualization__title">
          <span className="trend-icon">{getTrendIcon()}</span>
          <Text variant="body" size="small" weight="semibold">
            {trend.metric.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </div>
        <span 
          className={`trend-badge trend-badge--${trend.trend}`}
          style={{ backgroundColor: getTrendColor() }}
        >
          {trend.trend}
        </span>
      </div>
      
      <svg 
        className="trend-visualization__chart" 
        width={width} 
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Background grid */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} 
              stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
        
        {/* Trend line */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={getTrendColor()} 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {normalizedPoints.map((y, i) => {
          const x = padding + i * stepX;
          const yPos = height - padding - (y / 100) * (height - 2 * padding);
          return (
            <circle 
              key={i}
              cx={x} 
              cy={yPos} 
              r="3" 
              fill={getTrendColor()}
            />
          );
        })}
      </svg>

      <div className="trend-visualization__stats">
        <div className="stat">
          <Text variant="body" size="small" className="stat-label">Min</Text>
          <Text variant="body" size="small" weight="semibold">{min.toFixed(1)}</Text>
        </div>
        <div className="stat">
          <Text variant="body" size="small" className="stat-label">Avg</Text>
          <Text variant="body" size="small" weight="semibold">
            {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}
          </Text>
        </div>
        <div className="stat">
          <Text variant="body" size="small" className="stat-label">Max</Text>
          <Text variant="body" size="small" weight="semibold">{max.toFixed(1)}</Text>
        </div>
      </div>

      <Text variant="body" size="small" className="trend-visualization__analysis">
        {trend.analysis}
      </Text>
    </div>
  );
};

/**
 * Health Reports Widget for Secondary Users
 * Displays and allows downloading of health reports
 * Requirements: 4.1, 10.1, 10.3, 10.4
 */
export const HealthReportsWidget: React.FC<HealthReportsWidgetProps> = ({
  primaryUserId,
}) => {
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('weekly');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, this would call the API
        // const response = await fetch(`/api/v1/health/reports?userId=${primaryUserId}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();
        
        // Mock data with comprehensive trends for demonstration
        const mockReports: HealthReport[] = [
          {
            id: '1',
            userId: primaryUserId,
            reportType: 'weekly',
            generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            timeRange: {
              start: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
              end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            summary: 'Overall health status is stable. Medication adherence at 95%. All vital signs within normal ranges.',
            trends: [
              {
                metric: 'heart_rate',
                timeRange: {
                  start: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
                  end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
                dataPoints: [
                  { timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), value: 72, source: 'device' },
                  { timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), value: 75, source: 'device' },
                  { timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), value: 71, source: 'device' },
                  { timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), value: 73, source: 'device' },
                  { timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), value: 74, source: 'device' },
                ],
                trend: 'stable',
                analysis: 'Heart rate remains stable within normal range (70-75 bpm)',
              },
              {
                metric: 'blood_pressure_systolic',
                timeRange: {
                  start: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
                  end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
                dataPoints: [
                  { timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), value: 128, source: 'device' },
                  { timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), value: 125, source: 'device' },
                  { timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), value: 122, source: 'device' },
                  { timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), value: 120, source: 'device' },
                  { timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), value: 118, source: 'device' },
                ],
                trend: 'improving',
                analysis: 'Blood pressure showing positive improvement trend',
              },
            ],
            recommendations: [
              'Continue current medication schedule',
              'Maintain regular exercise routine',
              'Schedule follow-up appointment with cardiologist',
            ],
            exportUrl: '/reports/weekly-report-1.pdf',
          },
          {
            id: '2',
            userId: primaryUserId,
            reportType: 'monthly',
            generatedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
            timeRange: {
              start: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000),
              end: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
            },
            summary: 'Positive trends in blood pressure management. Weight stable. Good medication compliance.',
            trends: [
              {
                metric: 'weight',
                timeRange: {
                  start: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000),
                  end: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
                },
                dataPoints: [
                  { timestamp: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000), value: 175, source: 'device' },
                  { timestamp: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000), value: 174, source: 'device' },
                  { timestamp: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000), value: 173, source: 'device' },
                  { timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), value: 172, source: 'device' },
                ],
                trend: 'improving',
                analysis: 'Weight showing gradual decrease, trending positively',
              },
              {
                metric: 'oxygen_saturation',
                timeRange: {
                  start: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000),
                  end: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
                },
                dataPoints: [
                  { timestamp: new Date(Date.now() - 62 * 24 * 60 * 60 * 1000), value: 96, source: 'device' },
                  { timestamp: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000), value: 97, source: 'device' },
                  { timestamp: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000), value: 96, source: 'device' },
                  { timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), value: 97, source: 'device' },
                ],
                trend: 'stable',
                analysis: 'Oxygen saturation consistently within healthy range (96-97%)',
              },
            ],
            recommendations: [
              'Consider increasing daily walking duration',
              'Monitor sodium intake',
            ],
            exportUrl: '/reports/monthly-report-2.pdf',
          },
        ];

        setReports(mockReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [primaryUserId]);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // In a real implementation, this would call the API
      // const response = await fetch('/api/v1/health/reports/generate', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify({
      //     userId: primaryUserId,
      //     reportType: selectedType,
      //   })
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to generate report');
      // }
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh reports list (in production, this would refetch from API)
      // In a real app, we would call the fetch function again here
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report: HealthReport) => {
    try {
      // In a real implementation, this would download the PDF from S3
      // const response = await fetch(report.exportUrl, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `health-report-${report.reportType}-${report.id}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
      
      console.log('Downloading report:', report.id);
      // In production, this would trigger actual PDF download
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report. Please try again.');
    }
  };

  const toggleReportExpansion = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  const hasConcerningPatterns = (report: HealthReport): boolean => {
    return report.trends.some(t => t.trend === 'concerning' || t.trend === 'declining');
  };

  const getReportIcon = (type: ReportType) => {
    switch (type) {
      case 'weekly': return '📅';
      case 'monthly': return '📊';
      case 'quarterly': return '📈';
      case 'annual': return '📋';
      default: return '📄';
    }
  };

  const formatDateRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="health-reports health-reports--loading">
        <Text variant="body" size="medium">Loading reports...</Text>
      </div>
    );
  }

  return (
    <div className="health-reports">
      <div className="health-reports__header">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Health Reports
        </Text>
        <Text variant="body" size="small" className="health-reports__subtitle">
          View and download comprehensive health summaries with trend visualizations
        </Text>
      </div>

      {error && (
        <div className="health-reports__error" role="alert">
          <span className="error-icon">⚠️</span>
          <Text variant="body" size="medium">{error}</Text>
        </div>
      )}

      {/* Generate new report section */}
      <div className="health-reports__generate">
        <div className="generate-card">
          <div className="generate-card__content">
            <Text variant="heading" size="medium" weight="semibold">
              Generate New Report
            </Text>
            <Text variant="body" size="small" className="generate-card__description">
              Create a comprehensive health summary for sharing with healthcare providers
            </Text>
            
            <div className="generate-card__controls">
              <select 
                className="report-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ReportType)}
                disabled={generating}
              >
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="annual">Annual Report</option>
              </select>
              
              <Button
                variant="primary"
                size="large"
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reports list */}
      <div className="health-reports__list">
        <Text variant="heading" size="medium" weight="semibold" className="list-title">
          Previous Reports
        </Text>
        
        {reports.length === 0 ? (
          <div className="health-reports__empty">
            <Text variant="body" size="medium">
              No reports available yet. Generate your first report above.
            </Text>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map(report => {
              const isExpanded = expandedReportId === report.id;
              const hasConcerns = hasConcerningPatterns(report);
              
              return (
                <div 
                  key={report.id} 
                  className={`report-card ${hasConcerns ? 'report-card--concerning' : ''}`}
                >
                  {hasConcerns && (
                    <div className="report-card__alert">
                      <span className="alert-icon">⚠️</span>
                      <Text variant="body" size="small" weight="semibold">
                        Concerning patterns detected
                      </Text>
                    </div>
                  )}

                  <div className="report-card__header">
                    <div className="report-card__icon">
                      {getReportIcon(report.reportType)}
                    </div>
                    <div className="report-card__title">
                      <Text variant="body" size="medium" weight="semibold">
                        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
                      </Text>
                      <Text variant="body" size="small" className="report-card__date">
                        {formatDateRange(report.timeRange.start, report.timeRange.end)}
                      </Text>
                    </div>
                  </div>

                  <div className="report-card__content">
                    <Text variant="body" size="small" className="report-card__summary">
                      {report.summary}
                    </Text>

                    {/* Health Trends Visualizations */}
                    {report.trends.length > 0 && (
                      <div className="report-card__trends">
                        <div className="trends-header">
                          <Text variant="body" size="small" weight="semibold">
                            Health Trends ({report.trends.length} metrics)
                          </Text>
                          <button
                            className="expand-button"
                            onClick={() => toggleReportExpansion(report.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse trends' : 'Expand trends'}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="trends-visualizations">
                            {report.trends.map((trend, index) => (
                              <TrendVisualization key={index} trend={trend} />
                            ))}
                          </div>
                        )}

                        {!isExpanded && report.trends.length > 0 && (
                          <div className="trends-preview">
                            {report.trends.slice(0, 2).map((trend, index) => (
                              <div key={index} className="trend-preview-item">
                                <span className={`trend-indicator trend-indicator--${trend.trend}`}>
                                  {trend.trend === 'improving' && '↗'}
                                  {trend.trend === 'stable' && '→'}
                                  {trend.trend === 'declining' && '↘'}
                                  {trend.trend === 'concerning' && '⚠'}
                                </span>
                                <Text variant="body" size="small">
                                  {trend.metric.replace(/_/g, ' ')}
                                </Text>
                              </div>
                            ))}
                            {report.trends.length > 2 && (
                              <Text variant="body" size="small" className="more-trends">
                                +{report.trends.length - 2} more
                              </Text>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommendations */}
                    {report.recommendations.length > 0 && (
                      <div className={`report-card__recommendations ${hasConcerns ? 'recommendations--urgent' : ''}`}>
                        <Text variant="body" size="small" weight="semibold">
                          {hasConcerns ? '⚠️ Important Recommendations:' : 'Key Recommendations:'}
                        </Text>
                        <ul className="recommendations-list">
                          {report.recommendations.slice(0, isExpanded ? undefined : 2).map((rec, index) => (
                            <li key={index}>
                              <Text variant="body" size="small">{rec}</Text>
                            </li>
                          ))}
                        </ul>
                        {!isExpanded && report.recommendations.length > 2 && (
                          <Text variant="body" size="small" className="more-recommendations">
                            +{report.recommendations.length - 2} more
                          </Text>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="report-card__footer">
                    <Text variant="body" size="small" className="report-card__generated">
                      Generated: {report.generatedAt.toLocaleDateString()}
                    </Text>
                    <Button
                      variant="secondary"
                      size="large"
                      onClick={() => handleDownloadReport(report)}
                      aria-label={`Download ${report.reportType} report as PDF`}
                    >
                      📥 Download PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="health-reports__info">
        <Text variant="body" size="small" className="info-text">
          💡 Reports include vital signs trends, medication adherence, appointments, and personalized recommendations.
          Share these reports with healthcare providers for better care coordination.
        </Text>
      </div>
    </div>
  );
};
