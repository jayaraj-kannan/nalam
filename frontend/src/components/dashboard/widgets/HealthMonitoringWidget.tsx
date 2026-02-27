import React, { useState } from 'react';
import { Text } from '../../accessible';
import { HealthTrend, VitalSigns, MedicationRecord, AppointmentRecord } from '../../../types';
import './HealthMonitoringWidget.css';

export interface HealthMonitoringWidgetProps {
  primaryUserId: string;
  healthTrends: HealthTrend[];
  vitalHistory: VitalSigns[];
  medicationAdherence: {
    score: number;
    history: MedicationRecord[];
    missedDoses: number;
    takenDoses: number;
  };
  appointmentHistory: AppointmentRecord[];
}

type MetricType = 'heartRate' | 'bloodPressure' | 'temperature' | 'oxygenSaturation' | 'weight';

/**
 * Detailed Health Monitoring Interface for Secondary Users
 * Provides comprehensive health data visualization with charts, trends, and history
 * Requirements: 4.1, 4.5
 */
export const HealthMonitoringWidget: React.FC<HealthMonitoringWidgetProps> = ({
  primaryUserId,
  healthTrends,
  vitalHistory,
  medicationAdherence,
  appointmentHistory,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('heartRate');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  // Filter vital history based on selected time range
  const getFilteredVitals = () => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }
    
    return vitalHistory.filter(v => new Date(v.timestamp) >= cutoffDate);
  };

  // Get trend for selected metric
  const getMetricTrend = () => {
    return healthTrends.find(t => t.metric === selectedMetric);
  };

  // Format vital value for display
  const formatVitalValue = (vital: VitalSigns, type: MetricType): string => {
    switch (type) {
      case 'heartRate':
        return vital.heartRate ? `${vital.heartRate} bpm` : 'N/A';
      case 'bloodPressure':
        return vital.bloodPressure 
          ? `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`
          : 'N/A';
      case 'temperature':
        return vital.temperature ? `${vital.temperature.toFixed(1)}°F` : 'N/A';
      case 'oxygenSaturation':
        return vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : 'N/A';
      case 'weight':
        return vital.weight ? `${vital.weight.toFixed(1)} lbs` : 'N/A';
      default:
        return 'N/A';
    }
  };

  // Get metric value from vital signs
  const getMetricValue = (vital: VitalSigns, type: MetricType): number | null => {
    switch (type) {
      case 'heartRate':
        return vital.heartRate || null;
      case 'bloodPressure':
        return vital.bloodPressure?.systolic || null;
      case 'temperature':
        return vital.temperature || null;
      case 'oxygenSaturation':
        return vital.oxygenSaturation || null;
      case 'weight':
        return vital.weight || null;
      default:
        return null;
    }
  };

  // Calculate chart dimensions and data points
  const renderChart = () => {
    const filteredVitals = getFilteredVitals();
    const chartData = filteredVitals
      .map(v => ({
        timestamp: new Date(v.timestamp),
        value: getMetricValue(v, selectedMetric),
      }))
      .filter(d => d.value !== null);

    if (chartData.length === 0) {
      return (
        <div className="chart-empty">
          <Text variant="body">No data available for selected time range</Text>
        </div>
      );
    }

    // Simple line chart visualization
    const maxValue = Math.max(...chartData.map(d => d.value!));
    const minValue = Math.min(...chartData.map(d => d.value!));
    const range = maxValue - minValue || 1;
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = 40;

    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1 || 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((d.value! - minValue) / range) * (chartHeight - 2 * padding);
      return { x, y, ...d };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="chart-container">
        <svg width={chartWidth} height={chartHeight} className="health-chart">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} 
                stroke="#ccc" strokeWidth="1" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} 
                y2={chartHeight - padding} stroke="#ccc" strokeWidth="1" />
          
          {/* Data line */}
          <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="2" />
          
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2563eb" />
          ))}
          
          {/* Y-axis labels */}
          <text x={padding - 10} y={padding} textAnchor="end" fontSize="12" fill="#666">
            {maxValue.toFixed(0)}
          </text>
          <text x={padding - 10} y={chartHeight - padding} textAnchor="end" fontSize="12" fill="#666">
            {minValue.toFixed(0)}
          </text>
        </svg>
        
        <div className="chart-legend">
          <Text variant="body" size="normal">
            Showing {chartData.length} readings over {timeRange}
          </Text>
        </div>
      </div>
    );
  };

  // Render medication adherence section
  const renderMedicationAdherence = () => {
    const { score, history, missedDoses, takenDoses } = medicationAdherence;
    const totalDoses = missedDoses + takenDoses;
    const adherenceColor = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error';

    return (
      <div className="monitoring-section">
        <div className="section-header">
          <Text variant="heading" size="large" weight="bold" as="h3">
            Medication Adherence
          </Text>
        </div>
        
        <div className="adherence-summary">
          <div className={`adherence-score adherence-score--${adherenceColor}`}>
            <Text variant="heading" size="extra-large" weight="bold">
              {score}%
            </Text>
            <Text variant="body">Overall Adherence</Text>
          </div>
          
          <div className="adherence-stats">
            <div className="stat-box">
              <Text variant="heading" size="large" weight="bold" color="success">
                {takenDoses}
              </Text>
              <Text variant="body">Taken</Text>
            </div>
            
            <div className="stat-box">
              <Text variant="heading" size="large" weight="bold" color="error">
                {missedDoses}
              </Text>
              <Text variant="body">Missed</Text>
            </div>
            
            <div className="stat-box">
              <Text variant="heading" size="large" weight="bold">
                {totalDoses}
              </Text>
              <Text variant="body">Total</Text>
            </div>
          </div>
        </div>
        
        <div className="medication-history">
          <Text variant="heading" size="large" weight="semibold">
            Recent Medication History
          </Text>
          
          <div className="history-list">
            {history.slice(0, 10).map((record) => (
              <div key={record.id} className={`history-item history-item--${record.status}`}>
                <div className="history-item__icon">
                  {record.status === 'taken' ? '✓' : record.status === 'missed' ? '✗' : '○'}
                </div>
                <div className="history-item__content">
                  <Text variant="body" weight="semibold">
                    {record.medication.name}
                  </Text>
                  <Text variant="body" size="normal">
                    {record.medication.dosage} - {new Date(record.scheduledTime).toLocaleString()}
                  </Text>
                  {record.takenTime && (
                    <Text variant="body" size="normal" color="success">
                      Taken at {new Date(record.takenTime).toLocaleTimeString()}
                    </Text>
                  )}
                </div>
                <div className={`history-item__status history-item__status--${record.status}`}>
                  <Text variant="body" weight="semibold">
                    {record.status.toUpperCase()}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render appointment history section
  const renderAppointmentHistory = () => {
    const upcomingAppointments = appointmentHistory.filter(
      a => new Date(a.scheduledTime) > new Date() && a.status !== 'cancelled'
    );
    const pastAppointments = appointmentHistory.filter(
      a => new Date(a.scheduledTime) <= new Date() || a.status === 'cancelled'
    );

    return (
      <div className="monitoring-section">
        <div className="section-header">
          <Text variant="heading" size="large" weight="bold" as="h3">
            Appointment Schedule & History
          </Text>
        </div>
        
        <div className="appointments-container">
          <div className="appointments-upcoming">
            <Text variant="heading" size="large" weight="semibold">
              Upcoming Appointments ({upcomingAppointments.length})
            </Text>
            
            {upcomingAppointments.length > 0 ? (
              <div className="appointment-list">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="appointment-card appointment-card--upcoming">
                    <div className="appointment-card__icon">📅</div>
                    <div className="appointment-card__content">
                      <Text variant="body" weight="bold" size="large">
                        {appointment.provider.name}
                      </Text>
                      <Text variant="body">
                        {appointment.type.replace('_', ' ')}
                      </Text>
                      <Text variant="body" weight="semibold">
                        {new Date(appointment.scheduledTime).toLocaleString()}
                      </Text>
                      {appointment.location && (
                        <Text variant="body" size="normal">
                          📍 {appointment.location}
                        </Text>
                      )}
                    </div>
                    <div className={`appointment-card__status appointment-card__status--${appointment.status}`}>
                      <Text variant="body" weight="semibold">
                        {appointment.status.toUpperCase()}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text variant="body">No upcoming appointments</Text>
            )}
          </div>
          
          <div className="appointments-past">
            <Text variant="heading" size="large" weight="semibold">
              Past Appointments
            </Text>
            
            {pastAppointments.length > 0 ? (
              <div className="appointment-list">
                {pastAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="appointment-card appointment-card--past">
                    <div className="appointment-card__icon">
                      {appointment.status === 'completed' ? '✓' : 
                       appointment.status === 'missed' ? '✗' : '○'}
                    </div>
                    <div className="appointment-card__content">
                      <Text variant="body" weight="semibold">
                        {appointment.provider.name}
                      </Text>
                      <Text variant="body" size="normal">
                        {appointment.type.replace('_', ' ')}
                      </Text>
                      <Text variant="body" size="normal">
                        {new Date(appointment.scheduledTime).toLocaleDateString()}
                      </Text>
                    </div>
                    <div className={`appointment-card__status appointment-card__status--${appointment.status}`}>
                      <Text variant="body">
                        {appointment.status.toUpperCase()}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text variant="body">No past appointments</Text>
            )}
          </div>
        </div>
      </div>
    );
  };

  const metricTrend = getMetricTrend();

  return (
    <div className="health-monitoring">
      <div className="health-monitoring__header">
        <Text variant="heading" size="extra-large" weight="bold" as="h2">
          Detailed Health Monitoring
        </Text>
        <Text variant="body">
          Comprehensive health data for primary user
        </Text>
      </div>

      {/* Vital Signs Trends Section */}
      <div className="monitoring-section">
        <div className="section-header">
          <Text variant="heading" size="large" weight="bold" as="h3">
            Vital Signs Trends & Patterns
          </Text>
        </div>
        
        {/* Metric Selector */}
        <div className="metric-selector">
          <button
            className={`metric-button ${selectedMetric === 'heartRate' ? 'metric-button--active' : ''}`}
            onClick={() => setSelectedMetric('heartRate')}
            aria-label="View heart rate trends"
          >
            <span className="metric-button__icon">❤️</span>
            <Text variant="body" weight="semibold">Heart Rate</Text>
          </button>
          
          <button
            className={`metric-button ${selectedMetric === 'bloodPressure' ? 'metric-button--active' : ''}`}
            onClick={() => setSelectedMetric('bloodPressure')}
            aria-label="View blood pressure trends"
          >
            <span className="metric-button__icon">🩺</span>
            <Text variant="body" weight="semibold">Blood Pressure</Text>
          </button>
          
          <button
            className={`metric-button ${selectedMetric === 'oxygenSaturation' ? 'metric-button--active' : ''}`}
            onClick={() => setSelectedMetric('oxygenSaturation')}
            aria-label="View oxygen saturation trends"
          >
            <span className="metric-button__icon">🫁</span>
            <Text variant="body" weight="semibold">Oxygen</Text>
          </button>
          
          <button
            className={`metric-button ${selectedMetric === 'temperature' ? 'metric-button--active' : ''}`}
            onClick={() => setSelectedMetric('temperature')}
            aria-label="View temperature trends"
          >
            <span className="metric-button__icon">🌡️</span>
            <Text variant="body" weight="semibold">Temperature</Text>
          </button>
          
          <button
            className={`metric-button ${selectedMetric === 'weight' ? 'metric-button--active' : ''}`}
            onClick={() => setSelectedMetric('weight')}
            aria-label="View weight trends"
          >
            <span className="metric-button__icon">⚖️</span>
            <Text variant="body" weight="semibold">Weight</Text>
          </button>
        </div>
        
        {/* Time Range Selector */}
        <div className="time-range-selector">
          <button
            className={`time-button ${timeRange === 'week' ? 'time-button--active' : ''}`}
            onClick={() => setTimeRange('week')}
            aria-label="View past week"
          >
            <Text variant="body" weight="semibold">Week</Text>
          </button>
          
          <button
            className={`time-button ${timeRange === 'month' ? 'time-button--active' : ''}`}
            onClick={() => setTimeRange('month')}
            aria-label="View past month"
          >
            <Text variant="body" weight="semibold">Month</Text>
          </button>
          
          <button
            className={`time-button ${timeRange === 'quarter' ? 'time-button--active' : ''}`}
            onClick={() => setTimeRange('quarter')}
            aria-label="View past quarter"
          >
            <Text variant="body" weight="semibold">Quarter</Text>
          </button>
        </div>
        
        {/* Trend Analysis */}
        {metricTrend && (
          <div className={`trend-analysis trend-analysis--${metricTrend.trend}`}>
            <div className="trend-analysis__icon">
              {metricTrend.trend === 'improving' ? '📈' :
               metricTrend.trend === 'stable' ? '➡️' :
               metricTrend.trend === 'declining' ? '📉' : '⚠️'}
            </div>
            <div className="trend-analysis__content">
              <Text variant="heading" size="large" weight="bold">
                {metricTrend.trend.toUpperCase()}
              </Text>
              <Text variant="body">
                {metricTrend.analysis}
              </Text>
            </div>
          </div>
        )}
        
        {/* Chart */}
        {renderChart()}
        
        {/* Historical Data Table */}
        <div className="historical-data">
          <Text variant="heading" size="large" weight="semibold">
            Recent Readings
          </Text>
          
          <div className="data-table">
            {getFilteredVitals().slice(0, 10).map((vital, index) => (
              <div key={index} className="data-row">
                <div className="data-row__timestamp">
                  <Text variant="body">
                    {new Date(vital.timestamp).toLocaleString()}
                  </Text>
                </div>
                <div className="data-row__value">
                  <Text variant="body" weight="semibold">
                    {formatVitalValue(vital, selectedMetric)}
                  </Text>
                </div>
                <div className="data-row__source">
                  <Text variant="body" size="normal">
                    {vital.source}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Medication Adherence Section */}
      {renderMedicationAdherence()}

      {/* Appointment History Section */}
      {renderAppointmentHistory()}
    </div>
  );
};
