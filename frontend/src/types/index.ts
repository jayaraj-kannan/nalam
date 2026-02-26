// Shared TypeScript types for Frontend Application
// These types mirror the backend types to ensure consistency across the application

// ============================================================================
// User Management Types
// ============================================================================

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address?: Address;
  profilePicture?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PrimaryUser {
  id: string;
  profile: UserProfile;
  healthProfile: HealthProfile;
  careCircle: string[]; // Secondary user IDs
  preferences: UserPreferences;
  devices: string[]; // Device IDs
  createdAt: Date;
  lastActive: Date;
}

export interface SecondaryUser {
  id: string;
  profile: UserProfile;
  primaryUsers: string[]; // Primary user IDs they monitor
  alertPreferences: AlertPreferences;
  permissions: PermissionSet;
  createdAt: Date;
}

export interface HealthProfile {
  conditions: MedicalCondition[];
  medications: Medication[];
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  healthcareProviders: HealthcareProvider[];
  baselineVitals: BaselineVitals;
}

export interface MedicalCondition {
  name: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'chronic';
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  specialInstructions?: string;
  sideEffects?: string[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface HealthcareProvider {
  name: string;
  specialty: string;
  phone: string;
  email?: string;
  address?: Address;
  fax?: string;
}

export interface BaselineVitals {
  heartRate: { min: number; max: number };
  bloodPressure: {
    systolic: { min: number; max: number };
    diastolic: { min: number; max: number };
  };
  temperature: { min: number; max: number };
  oxygenSaturation: { min: number; max: number };
  weight: { min: number; max: number };
}

export interface UserPreferences {
  fontSize: 'large' | 'extra-large' | 'maximum';
  contrast: 'high' | 'maximum';
  voiceNavigation: boolean;
  screenReader: boolean;
  language: string;
  timezone: string;
  notificationChannels: NotificationChannel[];
}

export interface AlertPreferences {
  channels: NotificationChannel[];
  quietHours?: { start: string; end: string };
  alertTypes: {
    [key in AlertType]?: {
      enabled: boolean;
      urgencyLevels: AlertSeverity[];
    };
  };
}

export interface PermissionSet {
  canViewVitals: boolean;
  canViewMedications: boolean;
  canViewAppointments: boolean;
  canViewHealthRecords: boolean;
  canReceiveAlerts: boolean;
  canSendMessages: boolean;
  canManageDevices: boolean;
}

// ============================================================================
// Health Data Types
// ============================================================================

export interface VitalSigns {
  heartRate?: number;
  bloodPressure?: BloodPressure;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  timestamp: Date;
  source: DataSource;
}

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  unit?: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  timestamp: Date;
  type: HealthRecordType;
  data: HealthData;
  source: DataSource;
  verified: boolean;
}

export interface MedicationRecord {
  id: string;
  userId: string;
  medication: Medication;
  scheduledTime: Date;
  takenTime?: Date;
  status: MedicationStatus;
  adherenceScore: number;
  notes?: string;
}

export interface AppointmentRecord {
  id: string;
  userId: string;
  provider: HealthcareProvider;
  type: AppointmentType;
  scheduledTime: Date;
  duration?: number;
  status: AppointmentStatus;
  reminders: ReminderSettings;
  location?: string;
  notes?: string;
  preparationInstructions?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  times: number[]; // Hours before appointment
  channels: NotificationChannel[];
}

// ============================================================================
// Device and IoT Types
// ============================================================================

export interface HealthDevice {
  id: string;
  userId: string;
  type: DeviceType;
  manufacturer: string;
  model: string;
  capabilities: DeviceCapability[];
  connectionType: ConnectionType;
  status: DeviceStatus;
  lastSync?: Date;
  batteryLevel?: number;
  firmwareVersion?: string;
}

export interface DeviceReading {
  deviceId: string;
  userId: string;
  timestamp: Date;
  readings: SensorReading[];
  batteryLevel?: number;
  signalStrength?: number;
  location?: GeoLocation;
}

export interface SensorReading {
  type: SensorType;
  value: number;
  unit: string;
  accuracy: number;
  calibrationDate?: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

// ============================================================================
// Alert and Notification Types
// ============================================================================

export interface HealthAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  escalated: boolean;
  escalationLevel?: EscalationLevel;
  relatedData?: Record<string, unknown>;
}

export interface EmergencyEvent {
  id: string;
  userId: string;
  type: EmergencyType;
  timestamp: Date;
  location?: GeoLocation;
  vitals?: VitalSigns;
  symptoms?: string[];
  severity: EmergencySeverity;
  responders: string[]; // User IDs notified
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
}

export interface NotificationResult {
  notificationId: string;
  alertId: string;
  recipient: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
}

// ============================================================================
// Analytics and Reporting Types
// ============================================================================

export interface HealthTrend {
  metric: string;
  timeRange: TimeRange;
  dataPoints: DataPoint[];
  trend: 'improving' | 'stable' | 'declining' | 'concerning';
  analysis: string;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  source: DataSource;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface HealthAnalysis {
  userId: string;
  timeRange: TimeRange;
  trends: HealthTrend[];
  anomalies: AnomalyResult[];
  recommendations: string[];
  overallScore: number;
}

export interface AnomalyResult {
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  severity: AlertSeverity;
  timestamp: Date;
  description: string;
}

export interface HealthReport {
  id: string;
  userId: string;
  reportType: ReportType;
  generatedAt: Date;
  timeRange: TimeRange;
  summary: string;
  trends: HealthTrend[];
  recommendations: string[];
  exportUrl?: string;
}

// ============================================================================
// Care Circle Types
// ============================================================================

export interface CareCircleMember {
  userId: string;
  profile: UserProfile;
  relationship: RelationshipType;
  permissions: PermissionSet;
  joinedAt: Date;
  lastActive: Date;
}

export interface CommunicationSettings {
  allowMessages: boolean;
  allowCalls: boolean;
  preferredChannel: NotificationChannel;
  language: string;
}

export interface PermissionMatrix {
  [userId: string]: PermissionSet;
}

// ============================================================================
// Enums and Type Aliases
// ============================================================================

export type DataSource = 'manual' | 'device' | 'wearable';

export type HealthRecordType = 'vitals' | 'medication' | 'symptom' | 'appointment' | 'lab_result';

export type HealthData = VitalSigns | MedicationRecord | AppointmentRecord | Record<string, unknown>;

export type MedicationStatus = 'scheduled' | 'taken' | 'missed' | 'skipped';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed';

export type AppointmentType = 'checkup' | 'specialist' | 'emergency' | 'follow_up' | 'procedure' | 'lab_work';

export type DeviceType = 'blood_pressure' | 'glucose_meter' | 'pulse_oximeter' | 'fitness_tracker' | 'fall_detector' | 'weight_scale';

export type DeviceCapability = 'heart_rate' | 'blood_pressure' | 'temperature' | 'oxygen_saturation' | 'glucose' | 'weight' | 'fall_detection' | 'activity_tracking';

export type ConnectionType = 'bluetooth' | 'wifi' | 'cellular';

export type DeviceStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export type SensorType = 'heart_rate' | 'blood_pressure' | 'temperature' | 'oxygen_saturation' | 'glucose' | 'weight' | 'accelerometer' | 'gyroscope';

export type AlertType = 'vital_signs' | 'medication' | 'appointment' | 'emergency' | 'device' | 'check_in' | 'fall_detection';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EscalationLevel = 'care_circle' | 'emergency_contact' | 'emergency_services';

export type EmergencyType = 'fall' | 'abnormal_vitals' | 'missed_check_in' | 'manual_alert' | 'device_alert';

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'push' | 'sms' | 'email' | 'voice';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';

export type RelationshipType = 'spouse' | 'child' | 'sibling' | 'parent' | 'friend' | 'caregiver' | 'healthcare_provider' | 'other';
