// Unit tests for Anomaly Detection
// Requirements: 1.3 - Test anomaly detection for vital signs

import { detectAnomalies, shouldTriggerAlert, getHighestSeverity } from '../anomaly-detection';
import { VitalSigns, BaselineVitals } from '../types';

describe('Anomaly Detection', () => {
  const mockBaselineVitals: BaselineVitals = {
    heartRate: { min: 60, max: 100 },
    bloodPressure: {
      systolic: { min: 90, max: 140 },
      diastolic: { min: 60, max: 90 },
    },
    temperature: { min: 97.0, max: 99.5 },
    oxygenSaturation: { min: 95, max: 100 },
    weight: { min: 150, max: 200 },
  };

  describe('detectAnomalies', () => {
    it('should detect no anomalies for normal vitals', () => {
      const vitals: VitalSigns = {
        heartRate: 75,
        bloodPressure: { systolic: 120, diastolic: 80 },
        temperature: 98.6,
        oxygenSaturation: 98,
        weight: 170,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(0);
    });

    it('should detect high heart rate anomaly', () => {
      const vitals: VitalSigns = {
        heartRate: 150,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('heart_rate');
      expect(anomalies[0].value).toBe(150);
      expect(anomalies[0].severity).toBe('critical');
    });

    it('should detect low heart rate anomaly', () => {
      const vitals: VitalSigns = {
        heartRate: 45,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('heart_rate');
      expect(anomalies[0].value).toBe(45);
      expect(anomalies[0].severity).toBe('high');
    });

    it('should detect high blood pressure anomalies', () => {
      const vitals: VitalSigns = {
        bloodPressure: { systolic: 180, diastolic: 110 },
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(2);
      expect(anomalies.some(a => a.metric === 'systolic_blood_pressure')).toBe(true);
      expect(anomalies.some(a => a.metric === 'diastolic_blood_pressure')).toBe(true);
    });

    it('should detect low blood pressure anomalies', () => {
      const vitals: VitalSigns = {
        bloodPressure: { systolic: 80, diastolic: 50 },
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(2);
      expect(anomalies.some(a => a.metric === 'systolic_blood_pressure')).toBe(true);
      expect(anomalies.some(a => a.metric === 'diastolic_blood_pressure')).toBe(true);
    });

    it('should detect high temperature anomaly', () => {
      const vitals: VitalSigns = {
        temperature: 102.5,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('temperature');
      expect(anomalies[0].value).toBe(102.5);
      expect(anomalies[0].severity).toBe('critical');
    });

    it('should detect low temperature anomaly', () => {
      const vitals: VitalSigns = {
        temperature: 95.0,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('temperature');
      expect(anomalies[0].severity).toBe('critical');
    });

    it('should detect low oxygen saturation anomaly', () => {
      const vitals: VitalSigns = {
        oxygenSaturation: 88,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('oxygen_saturation');
      expect(anomalies[0].value).toBe(88);
      expect(anomalies[0].severity).toBe('critical');
    });

    it('should detect weight anomalies when baseline is provided', () => {
      const vitals: VitalSigns = {
        weight: 220,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('weight');
      expect(anomalies[0].value).toBe(220);
    });

    it('should detect multiple anomalies', () => {
      const vitals: VitalSigns = {
        heartRate: 150,
        bloodPressure: { systolic: 180, diastolic: 110 },
        temperature: 102.0,
        oxygenSaturation: 88,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies.length).toBeGreaterThanOrEqual(5);
    });

    it('should use default ranges when no baseline provided', () => {
      const vitals: VitalSigns = {
        heartRate: 150,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('heart_rate');
    });

    it('should include description in anomaly result', () => {
      const vitals: VitalSigns = {
        heartRate: 150,
        timestamp: new Date(),
        source: 'manual',
      };

      const anomalies = detectAnomalies(vitals, mockBaselineVitals);

      expect(anomalies[0].description).toBeDefined();
      expect(anomalies[0].description).toContain('heart rate');
      expect(anomalies[0].description).toContain('above normal range');
    });
  });

  describe('shouldTriggerAlert', () => {
    it('should return false for no anomalies', () => {
      expect(shouldTriggerAlert([])).toBe(false);
    });

    it('should return false for low severity anomalies', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 105,
          expectedRange: { min: 60, max: 100 },
          severity: 'low' as const,
          timestamp: new Date(),
          description: 'Low severity',
        },
      ];

      expect(shouldTriggerAlert(anomalies)).toBe(false);
    });

    it('should return true for medium severity anomalies', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 120,
          expectedRange: { min: 60, max: 100 },
          severity: 'medium' as const,
          timestamp: new Date(),
          description: 'Medium severity',
        },
      ];

      expect(shouldTriggerAlert(anomalies)).toBe(true);
    });

    it('should return true for high severity anomalies', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 150,
          expectedRange: { min: 60, max: 100 },
          severity: 'high' as const,
          timestamp: new Date(),
          description: 'High severity',
        },
      ];

      expect(shouldTriggerAlert(anomalies)).toBe(true);
    });

    it('should return true for critical severity anomalies', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 180,
          expectedRange: { min: 60, max: 100 },
          severity: 'critical' as const,
          timestamp: new Date(),
          description: 'Critical severity',
        },
      ];

      expect(shouldTriggerAlert(anomalies)).toBe(true);
    });
  });

  describe('getHighestSeverity', () => {
    it('should return low for empty anomalies', () => {
      expect(getHighestSeverity([])).toBe('low');
    });

    it('should return highest severity from multiple anomalies', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 105,
          expectedRange: { min: 60, max: 100 },
          severity: 'low' as const,
          timestamp: new Date(),
          description: 'Low',
        },
        {
          metric: 'temperature',
          value: 102,
          expectedRange: { min: 97, max: 99.5 },
          severity: 'high' as const,
          timestamp: new Date(),
          description: 'High',
        },
        {
          metric: 'oxygen_saturation',
          value: 92,
          expectedRange: { min: 95, max: 100 },
          severity: 'medium' as const,
          timestamp: new Date(),
          description: 'Medium',
        },
      ];

      expect(getHighestSeverity(anomalies)).toBe('high');
    });

    it('should return critical when present', () => {
      const anomalies = [
        {
          metric: 'heart_rate',
          value: 180,
          expectedRange: { min: 60, max: 100 },
          severity: 'critical' as const,
          timestamp: new Date(),
          description: 'Critical',
        },
        {
          metric: 'temperature',
          value: 102,
          expectedRange: { min: 97, max: 99.5 },
          severity: 'high' as const,
          timestamp: new Date(),
          description: 'High',
        },
      ];

      expect(getHighestSeverity(anomalies)).toBe('critical');
    });
  });
});
