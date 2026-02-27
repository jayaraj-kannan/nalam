/**
 * Dashboard Components for Healthcare Monitoring App
 * 
 * Primary User Dashboard - Elderly-friendly interface with:
 * - Large, clear widgets
 * - Prominent emergency alert button
 * - Maximum 6 main menu items
 * - High contrast and accessibility features
 * 
 * Secondary User Dashboard - Caregiver interface with:
 * - Health overview showing primary user status
 * - Alerts panel with filtering and sorting
 * - Communication hub for family messaging
 * - Health reports viewer
 * - Care circle settings panel
 * 
 * Requirements: 4.1, 5.2
 */

export { PrimaryUserDashboard } from './PrimaryUserDashboard';
export type { PrimaryUserDashboardProps } from './PrimaryUserDashboard';

export { SecondaryUserDashboard } from './SecondaryUserDashboard';
export type { SecondaryUserDashboardProps } from './SecondaryUserDashboard';

export { HealthMetricsWidget } from './widgets/HealthMetricsWidget';
export type { HealthMetricsWidgetProps } from './widgets/HealthMetricsWidget';

export { MedicationRemindersWidget } from './widgets/MedicationRemindersWidget';
export type { MedicationRemindersWidgetProps } from './widgets/MedicationRemindersWidget';

export { EmergencyAlertWidget } from './widgets/EmergencyAlertWidget';
export type { EmergencyAlertWidgetProps } from './widgets/EmergencyAlertWidget';

export { AppointmentScheduleWidget } from './widgets/AppointmentScheduleWidget';
export type { AppointmentScheduleWidgetProps } from './widgets/AppointmentScheduleWidget';

export { FamilyMessagesWidget } from './widgets/FamilyMessagesWidget';
export type { FamilyMessagesWidgetProps } from './widgets/FamilyMessagesWidget';

export { HealthOverviewWidget } from './widgets/HealthOverviewWidget';
export type { HealthOverviewWidgetProps } from './widgets/HealthOverviewWidget';

export { AlertsPanelWidget } from './widgets/AlertsPanelWidget';
export type { AlertsPanelWidgetProps } from './widgets/AlertsPanelWidget';

export { CommunicationHubWidget } from './widgets/CommunicationHubWidget';
export type { CommunicationHubWidgetProps } from './widgets/CommunicationHubWidget';

export { HealthReportsWidget } from './widgets/HealthReportsWidget';
export type { HealthReportsWidgetProps } from './widgets/HealthReportsWidget';

export { CareCircleSettingsWidget } from './widgets/CareCircleSettingsWidget';
export type { CareCircleSettingsWidgetProps } from './widgets/CareCircleSettingsWidget';
