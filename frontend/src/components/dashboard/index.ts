/**
 * Dashboard Components for Healthcare Monitoring App
 * 
 * Primary User Dashboard - Elderly-friendly interface with:
 * - Large, clear widgets
 * - Prominent emergency alert button
 * - Maximum 6 main menu items
 * - High contrast and accessibility features
 * 
 * Requirements: 5.2
 */

export { PrimaryUserDashboard } from './PrimaryUserDashboard';
export type { PrimaryUserDashboardProps } from './PrimaryUserDashboard';

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
