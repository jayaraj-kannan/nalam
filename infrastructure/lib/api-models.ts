/**
 * API Gateway Request/Response Models and Validation Schemas
 * 
 * This module defines the data models used for API Gateway request validation
 * and response formatting. These models ensure data integrity and provide
 * clear API contracts for clients.
 * 
 * Requirements: 8.2 - API Gateway configuration with validation
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway';

/**
 * Creates request/response models for the Healthcare Monitoring API
 */
export class ApiModels {
  /**
   * Vital Signs Model - validates health metrics input
   * Validates: heart rate (30-250), blood pressure (70-250/40-150),
   * temperature (35-42°C), oxygen saturation (70-100%), weight (20-300kg)
   */
  static createVitalSignsModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('VitalSignsModel', {
      contentType: 'application/json',
      modelName: 'VitalSignsModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'VitalSigns',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          heartRate: { type: apigateway.JsonSchemaType.NUMBER, minimum: 30, maximum: 250 },
          bloodPressure: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              systolic: { type: apigateway.JsonSchemaType.NUMBER, minimum: 70, maximum: 250 },
              diastolic: { type: apigateway.JsonSchemaType.NUMBER, minimum: 40, maximum: 150 },
            },
          },
          temperature: { type: apigateway.JsonSchemaType.NUMBER, minimum: 35, maximum: 42 },
          oxygenSaturation: { type: apigateway.JsonSchemaType.NUMBER, minimum: 70, maximum: 100 },
          weight: { type: apigateway.JsonSchemaType.NUMBER, minimum: 20, maximum: 300 },
          timestamp: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          source: { 
            type: apigateway.JsonSchemaType.STRING, 
            enum: ['manual', 'device', 'wearable'] 
          },
        },
      },
    });
  }

  /**
   * Emergency Alert Model - validates emergency event data
   */
  static createEmergencyAlertModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('EmergencyAlertModel', {
      contentType: 'application/json',
      modelName: 'EmergencyAlertModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'EmergencyAlert',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['severity'],
        properties: {
          location: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              latitude: { type: apigateway.JsonSchemaType.NUMBER },
              longitude: { type: apigateway.JsonSchemaType.NUMBER },
            },
          },
          symptoms: {
            type: apigateway.JsonSchemaType.ARRAY,
            items: { type: apigateway.JsonSchemaType.STRING },
          },
          severity: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      },
    });
  }

  /**
   * Medication Model - validates medication schedule data
   */
  static createMedicationModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('MedicationModel', {
      contentType: 'application/json',
      modelName: 'MedicationModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Medication',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['name', 'dosage', 'frequency'],
        properties: {
          name: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 200 },
          dosage: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          frequency: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          scheduledTime: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          instructions: { type: apigateway.JsonSchemaType.STRING, maxLength: 500 },
        },
      },
    });
  }

  /**
   * Appointment Model - validates appointment scheduling data
   */
  static createAppointmentModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('AppointmentModel', {
      contentType: 'application/json',
      modelName: 'AppointmentModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Appointment',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['scheduledTime', 'type'],
        properties: {
          scheduledTime: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          type: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          provider: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              name: { type: apigateway.JsonSchemaType.STRING },
              specialty: { type: apigateway.JsonSchemaType.STRING },
              phone: { type: apigateway.JsonSchemaType.STRING },
            },
          },
          notes: { type: apigateway.JsonSchemaType.STRING, maxLength: 1000 },
        },
      },
    });
  }

  /**
   * Error Response Model - standardized error response format
   */
  static createErrorResponseModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('ErrorResponseModel', {
      contentType: 'application/json',
      modelName: 'ErrorResponseModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'ErrorResponse',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          message: { type: apigateway.JsonSchemaType.STRING },
          code: { type: apigateway.JsonSchemaType.STRING },
          timestamp: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });
  }

  /**
   * Success Response Model - standardized success response format
   */
  static createSuccessResponseModel(api: apigateway.RestApi): apigateway.Model {
    return api.addModel('SuccessResponseModel', {
      contentType: 'application/json',
      modelName: 'SuccessResponseModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'SuccessResponse',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          message: { type: apigateway.JsonSchemaType.STRING },
          data: { type: apigateway.JsonSchemaType.OBJECT },
          timestamp: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });
  }
}

/**
 * API Gateway throttling configuration based on environment
 */
export interface ThrottlingConfig {
  rateLimit: number;
  burstLimit: number;
  quotaLimit: number;
}

export class ApiThrottling {
  /**
   * Get throttling configuration for the specified environment
   */
  static getConfig(environment: 'dev' | 'staging' | 'prod'): ThrottlingConfig {
    switch (environment) {
      case 'prod':
        return {
          rateLimit: 2000,
          burstLimit: 5000,
          quotaLimit: 1000000,
        };
      case 'staging':
        return {
          rateLimit: 1000,
          burstLimit: 2000,
          quotaLimit: 500000,
        };
      case 'dev':
      default:
        return {
          rateLimit: 500,
          burstLimit: 1000,
          quotaLimit: 100000,
        };
    }
  }
}
