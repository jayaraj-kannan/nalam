import React, { useState } from 'react';
import { Button } from '../accessible/Button';
import { Text } from '../accessible/Text';
import { VoiceInput } from '../accessible/VoiceInput';
import { VitalSigns } from '../../types';
import './HealthDataEntryForm.css';

export interface HealthDataEntryFormProps {
  onSubmit: (vitals: Partial<VitalSigns>) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Partial<VitalSigns>;
}

interface ValidationError {
  field: string;
  message: string;
}

interface FieldState {
  value: string;
  error?: string;
  touched: boolean;
}

const VITAL_RANGES = {
  heartRate: { min: 40, max: 200, unit: 'bpm', label: 'Heart Rate' },
  systolicBP: { min: 70, max: 200, unit: 'mmHg', label: 'Systolic Blood Pressure' },
  diastolicBP: { min: 40, max: 130, unit: 'mmHg', label: 'Diastolic Blood Pressure' },
  temperature: { min: 95.0, max: 105.0, unit: '°F', label: 'Temperature' },
  oxygenSaturation: { min: 70, max: 100, unit: '%', label: 'Oxygen Saturation' },
  weight: { min: 50, max: 500, unit: 'lbs', label: 'Weight' },
};

/**
 * Health Data Entry Form Component
 * Large, touch-friendly form for elderly users to enter vital signs
 * Supports voice input and real-time validation
 * Requirements: 1.1, 5.5
 */
export const HealthDataEntryForm: React.FC<HealthDataEntryFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
}) => {
  const [heartRate, setHeartRate] = useState<FieldState>({
    value: initialValues?.heartRate?.toString() || '',
    touched: false,
  });
  const [systolicBP, setSystolicBP] = useState<FieldState>({
    value: initialValues?.bloodPressure?.systolic?.toString() || '',
    touched: false,
  });
  const [diastolicBP, setDiastolicBP] = useState<FieldState>({
    value: initialValues?.bloodPressure?.diastolic?.toString() || '',
    touched: false,
  });
  const [temperature, setTemperature] = useState<FieldState>({
    value: initialValues?.temperature?.toString() || '',
    touched: false,
  });
  const [oxygenSaturation, setOxygenSaturation] = useState<FieldState>({
    value: initialValues?.oxygenSaturation?.toString() || '',
    touched: false,
  });
  const [weight, setWeight] = useState<FieldState>({
    value: initialValues?.weight?.toString() || '',
    touched: false,
  });

  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validate a numeric field
  const validateField = (
    value: string,
    min: number,
    max: number,
    label: string,
    unit: string
  ): string | undefined => {
    if (!value.trim()) {
      return undefined; // Optional field
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${label} must be a number`;
    }

    if (numValue < min || numValue > max) {
      return `${label} must be between ${min} and ${max} ${unit}`;
    }

    return undefined;
  };

  // Update field with validation
  const updateField = (
    field: 'heartRate' | 'systolicBP' | 'diastolicBP' | 'temperature' | 'oxygenSaturation' | 'weight',
    value: string,
    touched: boolean = false
  ) => {
    const setState = {
      heartRate: setHeartRate,
      systolicBP: setSystolicBP,
      diastolicBP: setDiastolicBP,
      temperature: setTemperature,
      oxygenSaturation: setOxygenSaturation,
      weight: setWeight,
    }[field];

    const range = VITAL_RANGES[field];
    const error = touched ? validateField(value, range.min, range.max, range.label, range.unit) : undefined;

    setState({ value, error, touched });
  };

  // Handle voice input for a field
  const handleVoiceInput = (field: string, transcript: string) => {
    // Extract numbers from transcript
    const numbers = transcript.match(/\d+\.?\d*/g);
    if (numbers && numbers.length > 0) {
      const value = numbers[0];
      updateField(field as any, value, true);
      setActiveVoiceField(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate all fields
    const heartRateError = validateField(heartRate.value, VITAL_RANGES.heartRate.min, VITAL_RANGES.heartRate.max, VITAL_RANGES.heartRate.label, VITAL_RANGES.heartRate.unit);
    const systolicError = validateField(systolicBP.value, VITAL_RANGES.systolicBP.min, VITAL_RANGES.systolicBP.max, VITAL_RANGES.systolicBP.label, VITAL_RANGES.systolicBP.unit);
    const diastolicError = validateField(diastolicBP.value, VITAL_RANGES.diastolicBP.min, VITAL_RANGES.diastolicBP.max, VITAL_RANGES.diastolicBP.label, VITAL_RANGES.diastolicBP.unit);
    const temperatureError = validateField(temperature.value, VITAL_RANGES.temperature.min, VITAL_RANGES.temperature.max, VITAL_RANGES.temperature.label, VITAL_RANGES.temperature.unit);
    const oxygenError = validateField(oxygenSaturation.value, VITAL_RANGES.oxygenSaturation.min, VITAL_RANGES.oxygenSaturation.max, VITAL_RANGES.oxygenSaturation.label, VITAL_RANGES.oxygenSaturation.unit);
    const weightError = validateField(weight.value, VITAL_RANGES.weight.min, VITAL_RANGES.weight.max, VITAL_RANGES.weight.label, VITAL_RANGES.weight.unit);

    // Mark all fields as touched and update errors
    setHeartRate({ ...heartRate, touched: true, error: heartRateError });
    setSystolicBP({ ...systolicBP, touched: true, error: systolicError });
    setDiastolicBP({ ...diastolicBP, touched: true, error: diastolicError });
    setTemperature({ ...temperature, touched: true, error: temperatureError });
    setOxygenSaturation({ ...oxygenSaturation, touched: true, error: oxygenError });
    setWeight({ ...weight, touched: true, error: weightError });

    // Check for validation errors
    const errors: ValidationError[] = [];
    if (heartRateError) errors.push({ field: 'heartRate', message: heartRateError });
    if (systolicError) errors.push({ field: 'systolicBP', message: systolicError });
    if (diastolicError) errors.push({ field: 'diastolicBP', message: diastolicError });
    if (temperatureError) errors.push({ field: 'temperature', message: temperatureError });
    if (oxygenError) errors.push({ field: 'oxygenSaturation', message: oxygenError });
    if (weightError) errors.push({ field: 'weight', message: weightError });

    if (errors.length > 0) {
      setSubmitError('Please fix the errors above before submitting');
      return;
    }

    // Check if at least one field is filled
    const hasData =
      heartRate.value ||
      systolicBP.value ||
      diastolicBP.value ||
      temperature.value ||
      oxygenSaturation.value ||
      weight.value;

    if (!hasData) {
      setSubmitError('Please enter at least one vital sign measurement');
      return;
    }

    // Build vitals object
    const vitals: Partial<VitalSigns> = {
      timestamp: new Date(),
      source: 'manual',
    };

    if (heartRate.value) {
      vitals.heartRate = parseFloat(heartRate.value);
    }

    if (systolicBP.value && diastolicBP.value) {
      vitals.bloodPressure = {
        systolic: parseFloat(systolicBP.value),
        diastolic: parseFloat(diastolicBP.value),
      };
    }

    if (temperature.value) {
      vitals.temperature = parseFloat(temperature.value);
    }

    if (oxygenSaturation.value) {
      vitals.oxygenSaturation = parseFloat(oxygenSaturation.value);
    }

    if (weight.value) {
      vitals.weight = parseFloat(weight.value);
    }

    // Submit the form
    setIsSubmitting(true);
    try {
      await onSubmit(vitals);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save vital signs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="health-data-form" onSubmit={handleSubmit}>
      <Text variant="heading" size="large" className="health-data-form__title">
        Enter Your Health Data
      </Text>

      <Text variant="body" color="secondary" className="health-data-form__description">
        Fill in any measurements you want to record. All fields are optional.
      </Text>

      {/* Heart Rate */}
      <div className="health-data-form__field">
        <label htmlFor="heartRate" className="health-data-form__label">
          <Text variant="label" size="large">
            Heart Rate ({VITAL_RANGES.heartRate.unit})
          </Text>
        </label>
        <div className="health-data-form__input-group">
          <input
            id="heartRate"
            type="number"
            className={`health-data-form__input ${heartRate.error ? 'health-data-form__input--error' : ''}`}
            value={heartRate.value}
            onChange={(e) => updateField('heartRate', e.target.value, false)}
            onBlur={() => updateField('heartRate', heartRate.value, true)}
            placeholder="e.g., 72"
            aria-describedby={heartRate.error ? 'heartRate-error' : undefined}
            aria-invalid={!!heartRate.error}
          />
          <Button
            type="button"
            variant={activeVoiceField === 'heartRate' ? 'emergency' : 'secondary'}
            size="large"
            onClick={() => setActiveVoiceField(activeVoiceField === 'heartRate' ? null : 'heartRate')}
            ariaLabel="Use voice input for heart rate"
            className="health-data-form__voice-button"
          >
            🎤
          </Button>
        </div>
        {activeVoiceField === 'heartRate' && (
          <VoiceInput
            onTranscript={(transcript) => handleVoiceInput('heartRate', transcript)}
            placeholder="Say your heart rate"
            continuous={false}
          />
        )}
        {heartRate.error && heartRate.touched && (
          <Text variant="caption" color="error" id="heartRate-error" className="health-data-form__error">
            {heartRate.error}
          </Text>
        )}
      </div>

      {/* Blood Pressure */}
      <div className="health-data-form__field">
        <Text variant="label" size="large" className="health-data-form__label">
          Blood Pressure ({VITAL_RANGES.systolicBP.unit})
        </Text>
        <div className="health-data-form__blood-pressure">
          <div className="health-data-form__bp-field">
            <label htmlFor="systolicBP" className="health-data-form__sublabel">
              <Text variant="caption">Systolic (Top Number)</Text>
            </label>
            <div className="health-data-form__input-group">
              <input
                id="systolicBP"
                type="number"
                className={`health-data-form__input ${systolicBP.error ? 'health-data-form__input--error' : ''}`}
                value={systolicBP.value}
                onChange={(e) => updateField('systolicBP', e.target.value, false)}
                onBlur={() => updateField('systolicBP', systolicBP.value, true)}
                placeholder="e.g., 120"
                aria-describedby={systolicBP.error ? 'systolicBP-error' : undefined}
                aria-invalid={!!systolicBP.error}
              />
              <Button
                type="button"
                variant={activeVoiceField === 'systolicBP' ? 'emergency' : 'secondary'}
                size="large"
                onClick={() => setActiveVoiceField(activeVoiceField === 'systolicBP' ? null : 'systolicBP')}
                ariaLabel="Use voice input for systolic blood pressure"
                className="health-data-form__voice-button"
              >
                🎤
              </Button>
            </div>
            {activeVoiceField === 'systolicBP' && (
              <VoiceInput
                onTranscript={(transcript) => handleVoiceInput('systolicBP', transcript)}
                placeholder="Say your systolic pressure"
                continuous={false}
              />
            )}
            {systolicBP.error && systolicBP.touched && (
              <Text variant="caption" color="error" id="systolicBP-error" className="health-data-form__error">
                {systolicBP.error}
              </Text>
            )}
          </div>

          <div className="health-data-form__bp-field">
            <label htmlFor="diastolicBP" className="health-data-form__sublabel">
              <Text variant="caption">Diastolic (Bottom Number)</Text>
            </label>
            <div className="health-data-form__input-group">
              <input
                id="diastolicBP"
                type="number"
                className={`health-data-form__input ${diastolicBP.error ? 'health-data-form__input--error' : ''}`}
                value={diastolicBP.value}
                onChange={(e) => updateField('diastolicBP', e.target.value, false)}
                onBlur={() => updateField('diastolicBP', diastolicBP.value, true)}
                placeholder="e.g., 80"
                aria-describedby={diastolicBP.error ? 'diastolicBP-error' : undefined}
                aria-invalid={!!diastolicBP.error}
              />
              <Button
                type="button"
                variant={activeVoiceField === 'diastolicBP' ? 'emergency' : 'secondary'}
                size="large"
                onClick={() => setActiveVoiceField(activeVoiceField === 'diastolicBP' ? null : 'diastolicBP')}
                ariaLabel="Use voice input for diastolic blood pressure"
                className="health-data-form__voice-button"
              >
                🎤
              </Button>
            </div>
            {activeVoiceField === 'diastolicBP' && (
              <VoiceInput
                onTranscript={(transcript) => handleVoiceInput('diastolicBP', transcript)}
                placeholder="Say your diastolic pressure"
                continuous={false}
              />
            )}
            {diastolicBP.error && diastolicBP.touched && (
              <Text variant="caption" color="error" id="diastolicBP-error" className="health-data-form__error">
                {diastolicBP.error}
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* Temperature */}
      <div className="health-data-form__field">
        <label htmlFor="temperature" className="health-data-form__label">
          <Text variant="label" size="large">
            Temperature ({VITAL_RANGES.temperature.unit})
          </Text>
        </label>
        <div className="health-data-form__input-group">
          <input
            id="temperature"
            type="number"
            step="0.1"
            className={`health-data-form__input ${temperature.error ? 'health-data-form__input--error' : ''}`}
            value={temperature.value}
            onChange={(e) => updateField('temperature', e.target.value, false)}
            onBlur={() => updateField('temperature', temperature.value, true)}
            placeholder="e.g., 98.6"
            aria-describedby={temperature.error ? 'temperature-error' : undefined}
            aria-invalid={!!temperature.error}
          />
          <Button
            type="button"
            variant={activeVoiceField === 'temperature' ? 'emergency' : 'secondary'}
            size="large"
            onClick={() => setActiveVoiceField(activeVoiceField === 'temperature' ? null : 'temperature')}
            ariaLabel="Use voice input for temperature"
            className="health-data-form__voice-button"
          >
            🎤
          </Button>
        </div>
        {activeVoiceField === 'temperature' && (
          <VoiceInput
            onTranscript={(transcript) => handleVoiceInput('temperature', transcript)}
            placeholder="Say your temperature"
            continuous={false}
          />
        )}
        {temperature.error && temperature.touched && (
          <Text variant="caption" color="error" id="temperature-error" className="health-data-form__error">
            {temperature.error}
          </Text>
        )}
      </div>

      {/* Oxygen Saturation */}
      <div className="health-data-form__field">
        <label htmlFor="oxygenSaturation" className="health-data-form__label">
          <Text variant="label" size="large">
            Oxygen Saturation ({VITAL_RANGES.oxygenSaturation.unit})
          </Text>
        </label>
        <div className="health-data-form__input-group">
          <input
            id="oxygenSaturation"
            type="number"
            className={`health-data-form__input ${oxygenSaturation.error ? 'health-data-form__input--error' : ''}`}
            value={oxygenSaturation.value}
            onChange={(e) => updateField('oxygenSaturation', e.target.value, false)}
            onBlur={() => updateField('oxygenSaturation', oxygenSaturation.value, true)}
            placeholder="e.g., 98"
            aria-describedby={oxygenSaturation.error ? 'oxygenSaturation-error' : undefined}
            aria-invalid={!!oxygenSaturation.error}
          />
          <Button
            type="button"
            variant={activeVoiceField === 'oxygenSaturation' ? 'emergency' : 'secondary'}
            size="large"
            onClick={() => setActiveVoiceField(activeVoiceField === 'oxygenSaturation' ? null : 'oxygenSaturation')}
            ariaLabel="Use voice input for oxygen saturation"
            className="health-data-form__voice-button"
          >
            🎤
          </Button>
        </div>
        {activeVoiceField === 'oxygenSaturation' && (
          <VoiceInput
            onTranscript={(transcript) => handleVoiceInput('oxygenSaturation', transcript)}
            placeholder="Say your oxygen saturation"
            continuous={false}
          />
        )}
        {oxygenSaturation.error && oxygenSaturation.touched && (
          <Text variant="caption" color="error" id="oxygenSaturation-error" className="health-data-form__error">
            {oxygenSaturation.error}
          </Text>
        )}
      </div>

      {/* Weight */}
      <div className="health-data-form__field">
        <label htmlFor="weight" className="health-data-form__label">
          <Text variant="label" size="large">
            Weight ({VITAL_RANGES.weight.unit})
          </Text>
        </label>
        <div className="health-data-form__input-group">
          <input
            id="weight"
            type="number"
            step="0.1"
            className={`health-data-form__input ${weight.error ? 'health-data-form__input--error' : ''}`}
            value={weight.value}
            onChange={(e) => updateField('weight', e.target.value, false)}
            onBlur={() => updateField('weight', weight.value, true)}
            placeholder="e.g., 150"
            aria-describedby={weight.error ? 'weight-error' : undefined}
            aria-invalid={!!weight.error}
          />
          <Button
            type="button"
            variant={activeVoiceField === 'weight' ? 'emergency' : 'secondary'}
            size="large"
            onClick={() => setActiveVoiceField(activeVoiceField === 'weight' ? null : 'weight')}
            ariaLabel="Use voice input for weight"
            className="health-data-form__voice-button"
          >
            🎤
          </Button>
        </div>
        {activeVoiceField === 'weight' && (
          <VoiceInput
            onTranscript={(transcript) => handleVoiceInput('weight', transcript)}
            placeholder="Say your weight"
            continuous={false}
          />
        )}
        {weight.error && weight.touched && (
          <Text variant="caption" color="error" id="weight-error" className="health-data-form__error">
            {weight.error}
          </Text>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="health-data-form__submit-error" role="alert">
          <Text variant="body" color="error">
            {submitError}
          </Text>
        </div>
      )}

      {/* Form Actions */}
      <div className="health-data-form__actions">
        <Button
          type="submit"
          variant="primary"
          size="extra-large"
          disabled={isSubmitting}
          ariaLabel="Save health data"
        >
          {isSubmitting ? 'Saving...' : 'Save Health Data'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="extra-large"
            onClick={onCancel}
            disabled={isSubmitting}
            ariaLabel="Cancel"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
