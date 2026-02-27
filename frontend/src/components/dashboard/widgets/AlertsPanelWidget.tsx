import React, { useState, useEffect } from 'react';
import { Button, Text } from '../../accessible';
import { HealthAlert, AlertType, AlertSeverity } from '../../../types';
import './AlertsPanelWidget.css';

export interface AlertsPanelWidgetProps {
  primaryUserId: string;
  userId: string;
}

type FilterType = 'all' | AlertType;
type FilterSeverity = 'all' | AlertSeverity;
type SortBy = 'timestamp' | 'severity';

/**
 * Alerts Panel Widget for Secondary Users
 * Displays alerts with filtering and sorting capabilities
 * Requirements: 4.1
 */
export const AlertsPanelWidget: React.FC<AlertsPanelWidgetProps> = ({
  primaryUserId,
  userId,
}) => {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [sortBy, setSortBy] = useState<SortBy>('timestamp');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would call the API
        // const response = await fetch(`/api/v1/alerts?userId=${primaryUserId}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();
        
        // Mock data for now
        const mockAlerts: HealthAlert[] = [
          {
            id: '1',
            userId: primaryUserId,
            type: 'vital_signs',
            severity: 'high',
            message: 'Blood pressure reading above normal range',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            acknowledged: false,
            escalated: false,
          },
          {
            id: '2',
            userId: primaryUserId,
            type: 'medication',
            severity: 'medium',
            message: 'Medication dose missed: Lisinopril 10mg',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
            acknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            escalated: false,
          },
          {
            id: '3',
            userId: primaryUserId,
            type: 'check_in',
            severity: 'low',
            message: 'Daily check-in completed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            acknowledged: true,
            escalated: false,
          },
        ];

        setAlerts(mockAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [primaryUserId, userId]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      // In a real implementation, this would call the API
      // await fetch(`/api/v1/alerts/${alertId}/acknowledge`, {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() }
          : alert
      ));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleEscalate = async (alertId: string) => {
    try {
      // In a real implementation, this would call the API
      // await fetch(`/api/v1/alerts/${alertId}/escalate`, {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, escalated: true }
          : alert
      ));
    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'vital_signs': return '❤️';
      case 'medication': return '💊';
      case 'appointment': return '📅';
      case 'emergency': return '🚨';
      case 'device': return '📱';
      case 'check_in': return '✅';
      case 'fall_detection': return '🤕';
      default: return '📋';
    }
  };

  const filteredAlerts = alerts
    .filter(alert => filter === 'all' || alert.type === filter)
    .filter(alert => filterSeverity === 'all' || alert.severity === filterSeverity)
    .filter(alert => showAcknowledged || !alert.acknowledged)
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        return b.timestamp.getTime() - a.timestamp.getTime();
      } else {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
    });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const highCount = alerts.filter(a => a.severity === 'high' && !a.acknowledged).length;
  const acknowledgedCount = alerts.filter(a => a.acknowledged).length;
  const escalatedCount = alerts.filter(a => a.escalated).length;

  if (loading) {
    return (
      <div className="alerts-panel alerts-panel--loading">
        <Text variant="body" size="medium">Loading alerts...</Text>
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-panel__header">
        <div className="alerts-panel__title">
          <Text variant="heading" size="large" weight="bold" as="h2">
            Alerts
          </Text>
          <div className="alerts-panel__counts">
            {criticalCount > 0 && (
              <span className="alert-count alert-count--critical">
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="alert-count alert-count--high">
                {highCount} High
              </span>
            )}
            {unacknowledgedCount > 0 && (
              <span className="alert-count alert-count--unread">
                {unacknowledgedCount} Unread
              </span>
            )}
          </div>
        </div>

        {/* Filters and sorting */}
        <div className="alerts-panel__controls">
          <div className="control-group">
            <Text variant="body" size="small" weight="semibold">Type:</Text>
            <select 
              className="control-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              aria-label="Filter alerts by type"
            >
              <option value="all">All Types</option>
              <option value="vital_signs">Vital Signs</option>
              <option value="medication">Medication</option>
              <option value="appointment">Appointment</option>
              <option value="emergency">Emergency</option>
              <option value="device">Device</option>
              <option value="check_in">Check-in</option>
              <option value="fall_detection">Fall Detection</option>
            </select>
          </div>

          <div className="control-group">
            <Text variant="body" size="small" weight="semibold">Urgency:</Text>
            <select 
              className="control-select"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
              aria-label="Filter alerts by urgency level"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="control-group">
            <Text variant="body" size="small" weight="semibold">Sort by:</Text>
            <select 
              className="control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              aria-label="Sort alerts by"
            >
              <option value="timestamp">Time</option>
              <option value="severity">Severity</option>
            </select>
          </div>

          <label className="control-checkbox">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              aria-label="Show acknowledged alerts"
            />
            <Text variant="body" size="small">Show acknowledged</Text>
          </label>
        </div>
      </div>

      {/* Alert statistics */}
      <div className="alerts-panel__stats">
        <div className="stat-card">
          <Text variant="body" size="small" className="stat-card__label">Total Alerts</Text>
          <Text variant="heading" size="large" weight="bold" className="stat-card__value">{alerts.length}</Text>
        </div>
        <div className="stat-card">
          <Text variant="body" size="small" className="stat-card__label">Unacknowledged</Text>
          <Text variant="heading" size="large" weight="bold" className="stat-card__value stat-card__value--warning">{unacknowledgedCount}</Text>
        </div>
        <div className="stat-card">
          <Text variant="body" size="small" className="stat-card__label">Acknowledged</Text>
          <Text variant="heading" size="large" weight="bold" className="stat-card__value stat-card__value--success">{acknowledgedCount}</Text>
        </div>
        <div className="stat-card">
          <Text variant="body" size="small" className="stat-card__label">Escalated</Text>
          <Text variant="heading" size="large" weight="bold" className="stat-card__value stat-card__value--danger">{escalatedCount}</Text>
        </div>
      </div>

      <div className="alerts-panel__list">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-panel__empty">
            <Text variant="body" size="medium">
              {showAcknowledged ? 'No alerts found' : 'No unacknowledged alerts'}
            </Text>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id} 
              role="article"
              className={`alert-item alert-item--${alert.severity} ${alert.acknowledged ? 'alert-item--acknowledged' : ''}`}
            >
              <div className="alert-item__icon">
                <span className="alert-item__severity-icon">{getSeverityIcon(alert.severity)}</span>
                <span className="alert-item__type-icon">{getTypeIcon(alert.type)}</span>
              </div>

              <div className="alert-item__content">
                <div className="alert-item__header">
                  <Text variant="body" size="medium" weight="semibold">
                    {alert.message}
                  </Text>
                  <div className="alert-item__badges">
                    <span className={`badge badge--${alert.severity}`}>
                      {alert.severity}
                    </span>
                    <span className="badge badge--type">
                      {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="alert-item__meta">
                  <Text variant="body" size="small" className="alert-item__timestamp">
                    {alert.timestamp.toLocaleString()}
                  </Text>
                  {alert.acknowledged && alert.acknowledgedAt && (
                    <Text variant="body" size="small" className="alert-item__ack">
                      ✓ Acknowledged {alert.acknowledgedAt.toLocaleString()}
                    </Text>
                  )}
                  {alert.escalated && (
                    <Text variant="body" size="small" className="alert-item__escalated">
                      ⬆️ Escalated
                    </Text>
                  )}
                </div>

                {!alert.acknowledged && (
                  <div className="alert-item__actions">
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    {alert.severity === 'high' || alert.severity === 'critical' ? (
                      <Button
                        variant="emergency"
                        size="large"
                        onClick={() => handleEscalate(alert.id)}
                        disabled={alert.escalated}
                      >
                        {alert.escalated ? 'Escalated' : 'Escalate'}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
