import React, { useState, useEffect } from 'react';
import { Text } from '../../accessible';
import { VitalSigns } from '../../../types';
import './HealthMetricsWidget.css';

export interface HealthMetricsWidgetProps {
  userId: string;
}

/**
 * Health Metrics Widget - Displays current vital signs
 * Shows heart rate, blood pressure, temperature, oxygen saturation
 * Requirements: 1.4, 5.2
 */
export const HealthMetricsWidget: React.FC<HealthMetricsWidgetProps> = ({ userId }) => {
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch latest vitals from API
    // Mock data for now
    const mockVitals: VitalSigns = {
      heartRate: 72,
      bloodPressure: { systolic: 120, diastolic: 80 },
      temperature: 98.6,
      oxygenSaturation: 98,
      timestamp: new Date(),
      source: 'device',
    };

    setTimeout(() => {
      setVitals(mockVitals);
      setLoading(false);
    }, 500);
  }, [userId]);

  if (loading) {
    return (
      <div className="health-metrics-widget">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Health Metrics
        </Text>
        <Text variant="body" size="large">Loading...</Text>
      </div>
    );
  }

  return (
    <div className="health-metrics-widget">
      <Text variant="heading" size="large" weight="bold" as="h2" className="widget-title">
        Health Metrics
      </Text>

      <div className="metrics-grid">
        {/* Heart Rate */}
        {vitals?.heartRate && (
          <div className="metric-item">
            <Text variant="label" size="normal" color="secondary">
              Heart Rate
            </Text>
            <Text variant="body" size="extra-large" weight="bold" color="primary">
              {vitals.heartRate} <span className="metric-unit">bpm</span>
            </Text>
          </div>
        )}

        {/* Blood Pressure */}
        {vitals?.bloodPressure && (
          <div className="metric-item">
            <Text variant="label" size="normal" color="secondary">
              Blood Pressure
            </Text>
            <Text variant="body" size="extra-large" weight="bold" color="primary">
              {vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}
              <span className="metric-unit"> mmHg</span>
            </Text>
          </div>
        )}

        {/* Temperature */}
        {vitals?.temperature && (
          <div className="metric-item">
            <Text variant="label" size="normal" color="secondary">
              Temperature
            </Text>
            <Text variant="body" size="extra-large" weight="bold" color="primary">
              {vitals.temperature}°<span className="metric-unit">F</span>
            </Text>
          </div>
        )}

        {/* Oxygen Saturation */}
        {vitals?.oxygenSaturation && (
          <div className="metric-item">
            <Text variant="label" size="normal" color="secondary">
              Oxygen Level
            </Text>
            <Text variant="body" size="extra-large" weight="bold" color="primary">
              {vitals.oxygenSaturation}<span className="metric-unit">%</span>
            </Text>
          </div>
        )}
      </div>

      <div className="widget-footer">
        <Text variant="caption" size="normal" color="secondary">
          Last updated: {vitals?.timestamp ? new Date(vitals.timestamp).toLocaleTimeString() : 'N/A'}
        </Text>
      </div>
    </div>
  );
};
