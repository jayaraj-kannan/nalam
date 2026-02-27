import React from 'react';
import { Text } from '../../accessible';
import { VitalSigns } from '../../../types';
import './HealthOverviewWidget.css';

export interface HealthOverviewWidgetProps {
  primaryUserId: string;
  dashboardData: any;
}

/**
 * Health Overview Widget for Secondary Users
 * Displays comprehensive health status of the primary user
 * Requirements: 4.1
 */
export const HealthOverviewWidget: React.FC<HealthOverviewWidgetProps> = ({
  primaryUserId,
  dashboardData,
}) => {
  const { healthStatus, medications, appointments, alerts } = dashboardData || {};

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
      case 'concerning': return '⚠️';
      default: return '❓';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'success';
      case 'stable': return 'info';
      case 'declining': return 'warning';
      case 'concerning': return 'error';
      default: return 'default';
    }
  };

  const formatVitalValue = (vital: any, type: string) => {
    if (!vital) return 'N/A';
    
    switch (type) {
      case 'heartRate':
        return `${vital} bpm`;
      case 'bloodPressure':
        return `${vital.systolic}/${vital.diastolic} mmHg`;
      case 'temperature':
        return `${vital.toFixed(1)}°F`;
      case 'oxygenSaturation':
        return `${vital}%`;
      case 'weight':
        return `${vital.toFixed(1)} lbs`;
      default:
        return vital.toString();
    }
  };

  const getVitalStatus = (value: number | undefined, type: string): 'normal' | 'warning' | 'critical' => {
    if (!value) return 'normal';
    
    switch (type) {
      case 'heartRate':
        if (value < 60 || value > 100) return 'warning';
        if (value < 50 || value > 120) return 'critical';
        return 'normal';
      case 'oxygenSaturation':
        if (value < 95) return 'warning';
        if (value < 90) return 'critical';
        return 'normal';
      case 'temperature':
        if (value < 97 || value > 99) return 'warning';
        if (value < 95 || value > 101) return 'critical';
        return 'normal';
      default:
        return 'normal';
    }
  };

  return (
    <div className="health-overview">
      <div className="health-overview__header">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Health Overview
        </Text>
        {healthStatus?.lastRecorded && (
          <Text variant="body" size="small" className="health-overview__timestamp">
            Last updated: {new Date(healthStatus.lastRecorded).toLocaleString()}
          </Text>
        )}
      </div>

      <div className="health-overview__grid">
        {/* Overall Health Status Card */}
        <div className="overview-card overview-card--featured">
          <div className="overview-card__header">
            <Text variant="heading" size="medium" weight="semibold">
              Overall Status
            </Text>
          </div>
          <div className="overview-card__content">
            <div className={`health-trend health-trend--${getTrendColor(healthStatus?.vitalsTrend)}`}>
              <span className="health-trend__icon">{getTrendIcon(healthStatus?.vitalsTrend)}</span>
              <Text variant="body" size="large" weight="bold" className="health-trend__label">
                {healthStatus?.vitalsTrend || 'Unknown'}
              </Text>
            </div>
          </div>
        </div>

        {/* Vital Signs Card */}
        <div className="overview-card">
          <div className="overview-card__header">
            <Text variant="heading" size="medium" weight="semibold">
              Latest Vitals
            </Text>
          </div>
          <div className="overview-card__content">
            {healthStatus?.latestVitals ? (
              <div className="vitals-list">
                {healthStatus.latestVitals.heartRate && (
                  <div className={`vital-item vital-item--${getVitalStatus(healthStatus.latestVitals.heartRate, 'heartRate')}`}>
                    <span className="vital-item__icon">❤️</span>
                    <div className="vital-item__info">
                      <Text variant="body" size="small" className="vital-item__label">Heart Rate</Text>
                      <Text variant="body" size="medium" weight="semibold">
                        {formatVitalValue(healthStatus.latestVitals.heartRate, 'heartRate')}
                      </Text>
                    </div>
                  </div>
                )}
                
                {healthStatus.latestVitals.bloodPressure && (
                  <div className="vital-item">
                    <span className="vital-item__icon">🩺</span>
                    <div className="vital-item__info">
                      <Text variant="body" size="small" className="vital-item__label">Blood Pressure</Text>
                      <Text variant="body" size="medium" weight="semibold">
                        {formatVitalValue(healthStatus.latestVitals.bloodPressure, 'bloodPressure')}
                      </Text>
                    </div>
                  </div>
                )}
                
                {healthStatus.latestVitals.oxygenSaturation && (
                  <div className={`vital-item vital-item--${getVitalStatus(healthStatus.latestVitals.oxygenSaturation, 'oxygenSaturation')}`}>
                    <span className="vital-item__icon">🫁</span>
                    <div className="vital-item__info">
                      <Text variant="body" size="small" className="vital-item__label">Oxygen</Text>
                      <Text variant="body" size="medium" weight="semibold">
                        {formatVitalValue(healthStatus.latestVitals.oxygenSaturation, 'oxygenSaturation')}
                      </Text>
                    </div>
                  </div>
                )}
                
                {healthStatus.latestVitals.temperature && (
                  <div className={`vital-item vital-item--${getVitalStatus(healthStatus.latestVitals.temperature, 'temperature')}`}>
                    <span className="vital-item__icon">🌡️</span>
                    <div className="vital-item__info">
                      <Text variant="body" size="small" className="vital-item__label">Temperature</Text>
                      <Text variant="body" size="medium" weight="semibold">
                        {formatVitalValue(healthStatus.latestVitals.temperature, 'temperature')}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Text variant="body" size="medium" className="no-data">
                No recent vital signs recorded
              </Text>
            )}
          </div>
        </div>

        {/* Medications Card */}
        <div className="overview-card">
          <div className="overview-card__header">
            <Text variant="heading" size="medium" weight="semibold">
              Medications
            </Text>
          </div>
          <div className="overview-card__content">
            <div className="stat-grid">
              <div className="stat-item">
                <Text variant="body" size="small" className="stat-item__label">Adherence</Text>
                <div className={`stat-item__value stat-item__value--${medications?.adherenceScore >= 80 ? 'success' : 'warning'}`}>
                  <Text variant="body" size="large" weight="bold">
                    {medications?.adherenceScore || 0}%
                  </Text>
                </div>
              </div>
              
              <div className="stat-item">
                <Text variant="body" size="small" className="stat-item__label">Upcoming</Text>
                <div className="stat-item__value">
                  <Text variant="body" size="large" weight="bold">
                    {medications?.upcomingCount || 0}
                  </Text>
                </div>
              </div>
              
              <div className="stat-item">
                <Text variant="body" size="small" className="stat-item__label">Missed Today</Text>
                <div className={`stat-item__value ${medications?.missedToday > 0 ? 'stat-item__value--error' : ''}`}>
                  <Text variant="body" size="large" weight="bold">
                    {medications?.missedToday || 0}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Card */}
        <div className="overview-card">
          <div className="overview-card__header">
            <Text variant="heading" size="medium" weight="semibold">
              Appointments
            </Text>
          </div>
          <div className="overview-card__content">
            {appointments?.nextAppointment ? (
              <div className="appointment-preview">
                <div className="appointment-preview__icon">📅</div>
                <div className="appointment-preview__info">
                  <Text variant="body" size="medium" weight="semibold">
                    {appointments.nextAppointment.provider}
                  </Text>
                  <Text variant="body" size="small" className="appointment-preview__type">
                    {appointments.nextAppointment.type}
                  </Text>
                  <Text variant="body" size="small" className="appointment-preview__time">
                    {new Date(appointments.nextAppointment.scheduledTime).toLocaleString()}
                  </Text>
                </div>
              </div>
            ) : (
              <Text variant="body" size="medium" className="no-data">
                No upcoming appointments
              </Text>
            )}
            
            {appointments?.upcomingCount > 1 && (
              <Text variant="body" size="small" className="appointment-count">
                +{appointments.upcomingCount - 1} more appointment{appointments.upcomingCount - 1 !== 1 ? 's' : ''}
              </Text>
            )}
          </div>
        </div>

        {/* Alerts Summary Card */}
        <div className="overview-card">
          <div className="overview-card__header">
            <Text variant="heading" size="medium" weight="semibold">
              Alerts
            </Text>
          </div>
          <div className="overview-card__content">
            <div className="stat-grid">
              <div className="stat-item">
                <Text variant="body" size="small" className="stat-item__label">Critical</Text>
                <div className={`stat-item__value ${alerts?.criticalCount > 0 ? 'stat-item__value--error' : ''}`}>
                  <Text variant="body" size="large" weight="bold">
                    {alerts?.criticalCount || 0}
                  </Text>
                </div>
              </div>
              
              <div className="stat-item">
                <Text variant="body" size="small" className="stat-item__label">Unread</Text>
                <div className={`stat-item__value ${alerts?.unacknowledgedCount > 0 ? 'stat-item__value--warning' : ''}`}>
                  <Text variant="body" size="large" weight="bold">
                    {alerts?.unacknowledgedCount || 0}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
