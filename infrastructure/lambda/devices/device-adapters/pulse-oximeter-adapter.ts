// Pulse Oximeter Adapter
// Requirements: 7.2

import { SensorReading } from '../../shared/types';

export interface PulseOximeterReading {
  oxygenSaturation: number; // SpO2 percentage
  heartRate: number; // bpm
  perfusionIndex?: number; // PI percentage
  timestamp: Date;
}

export class PulseOximeterAdapter {
  /**
   * Convert raw pulse oximeter data to standardized sensor readings
   */
  static convertToSensorReadings(data: PulseOximeterReading): SensorReading[] {
    const readings: SensorReading[] = [];

    // Oxygen saturation reading
    readings.push({
      type: 'oxygen_saturation',
      value: data.oxygenSaturation,
      unit: '%',
      accuracy: 95, // Typical accuracy for pulse oximeters
    });

    // Heart rate reading
    readings.push({
      type: 'heart_rate',
      value: data.heartRate,
      unit: 'bpm',
      accuracy: 95,
    });

    return readings;
  }

  /**
   * Parse data from generic pulse oximeters
   */
  static parseGenericData(rawData: string): PulseOximeterReading {
    // Example format: "SPO2:98,HR:72,PI:5.2,TIME:2024-01-15T10:30:00Z"
    const parts = rawData.split(',');
    const data: Record<string, string> = {};

    parts.forEach((part) => {
      const [key, value] = part.split(':');
      data[key] = value;
    });

    return {
      oxygenSaturation: parseInt(data.SPO2, 10),
      heartRate: parseInt(data.HR, 10),
      perfusionIndex: data.PI ? parseFloat(data.PI) : undefined,
      timestamp: new Date(data.TIME || Date.now()),
    };
  }

  /**
   * Parse data from Masimo pulse oximeters
   */
  static parseMasimoData(rawData: Record<string, unknown>): PulseOximeterReading {
    return {
      oxygenSaturation: rawData.spo2 as number,
      heartRate: rawData.pulse_rate as number,
      perfusionIndex: rawData.perfusion_index as number | undefined,
      timestamp: new Date((rawData.timestamp as number) * 1000),
    };
  }

  /**
   * Validate pulse oximeter reading
   */
  static validate(reading: PulseOximeterReading): boolean {
    // SpO2 should be between 70-100%
    if (reading.oxygenSaturation < 70 || reading.oxygenSaturation > 100) {
      return false;
    }

    // Heart rate should be between 30-220 bpm
    if (reading.heartRate < 30 || reading.heartRate > 220) {
      return false;
    }

    // Perfusion index validation if present (typically 0-20%)
    if (reading.perfusionIndex !== undefined && (reading.perfusionIndex < 0 || reading.perfusionIndex > 20)) {
      return false;
    }

    return true;
  }

  /**
   * Classify oxygen saturation level
   */
  static classifySpO2Level(spo2: number): 'critical' | 'low' | 'normal' {
    if (spo2 < 90) {
      return 'critical';
    } else if (spo2 < 95) {
      return 'low';
    } else {
      return 'normal';
    }
  }
}
