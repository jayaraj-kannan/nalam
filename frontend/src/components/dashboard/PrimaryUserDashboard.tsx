import React, { useState, useEffect } from 'react';
import { Button, Text } from '../accessible';
import { HealthMetricsWidget } from './widgets/HealthMetricsWidget';
import { MedicationRemindersWidget } from './widgets/MedicationRemindersWidget';
import { EmergencyAlertWidget } from './widgets/EmergencyAlertWidget';
import { AppointmentScheduleWidget } from './widgets/AppointmentScheduleWidget';
import { FamilyMessagesWidget } from './widgets/FamilyMessagesWidget';
import { VoiceNavigationProvider, useVoiceCommands, useVoiceNavigationContext } from '../accessible/VoiceNavigationProvider';
import './PrimaryUserDashboard.css';

export interface PrimaryUserDashboardProps {
  userId: string;
  userName: string;
  onEmergencyAlert?: () => void;
  voiceNavigationEnabled?: boolean;
}

/**
 * Dashboard Content Component (internal)
 * Separated to use voice navigation context
 */
const DashboardContent: React.FC<PrimaryUserDashboardProps> = ({
  userId,
  userName,
  onEmergencyAlert,
}) => {
  const [activeSection, setActiveSection] = useState<string>('home');
  const { speakInstruction, speakNotification } = useVoiceNavigationContext();

  // Register voice commands for navigation
  useVoiceCommands([
    {
      command: 'go home',
      aliases: ['home', 'go to home', 'show home'],
      action: () => {
        setActiveSection('home');
        speakNotification('Showing home screen');
      },
      description: 'Navigate to home screen',
    },
    {
      command: 'show health',
      aliases: ['health', 'go to health', 'view health', 'my health'],
      action: () => {
        setActiveSection('health');
        speakNotification('Showing health metrics');
      },
      description: 'View health metrics',
    },
    {
      command: 'show medications',
      aliases: ['medications', 'medicine', 'pills', 'my medications'],
      action: () => {
        setActiveSection('medications');
        speakNotification('Showing medications');
      },
      description: 'View medication schedule',
    },
    {
      command: 'show appointments',
      aliases: ['appointments', 'schedule', 'my appointments', 'doctor appointments'],
      action: () => {
        setActiveSection('appointments');
        speakNotification('Showing appointments');
      },
      description: 'View appointment schedule',
    },
    {
      command: 'show messages',
      aliases: ['messages', 'family messages', 'my messages'],
      action: () => {
        setActiveSection('messages');
        speakNotification('Showing family messages');
      },
      description: 'View family messages',
    },
    {
      command: 'emergency',
      aliases: ['help', 'call for help', 'i need help', 'emergency alert'],
      action: () => {
        onEmergencyAlert?.();
        speakNotification('Emergency alert activated', 'critical');
      },
      description: 'Trigger emergency alert',
    },
    {
      command: 'help',
      aliases: ['what can i say', 'voice commands', 'commands'],
      action: () => {
        speakInstruction(
          'You can say: go home, show health, show medications, show appointments, show messages, or emergency for help.'
        );
      },
      description: 'List available voice commands',
    },
  ]);

  // Announce section changes
  useEffect(() => {
    const sectionNames: Record<string, string> = {
      home: 'Home',
      health: 'Health Metrics',
      medications: 'Medications',
      appointments: 'Appointments',
      messages: 'Family Messages',
      settings: 'Settings',
    };

    if (activeSection !== 'home') {
      speakInstruction(`Now viewing ${sectionNames[activeSection]}`);
    }
  }, [activeSection, speakInstruction]);

  const handleNavigation = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="primary-dashboard">
      {/* Header with greeting */}
      <header className="primary-dashboard__header">
        <Text variant="heading" size="extra-large" weight="bold" as="h1">
          Hello, {userName}
        </Text>
      </header>

      {/* Main content area with widgets */}
      <main className="primary-dashboard__content">
        {/* Emergency Alert Button - Prominent placement */}
        <div className="primary-dashboard__emergency">
          <EmergencyAlertWidget userId={userId} onEmergencyAlert={onEmergencyAlert} />
        </div>

        {/* Health Metrics Widget */}
        <div className="primary-dashboard__widget">
          <HealthMetricsWidget userId={userId} />
        </div>

        {/* Medication Reminders Widget */}
        <div className="primary-dashboard__widget">
          <MedicationRemindersWidget userId={userId} />
        </div>

        {/* Appointment Schedule Widget */}
        <div className="primary-dashboard__widget">
          <AppointmentScheduleWidget userId={userId} />
        </div>

        {/* Family Messages Widget */}
        <div className="primary-dashboard__widget">
          <FamilyMessagesWidget userId={userId} />
        </div>
      </main>

      {/* Navigation - Maximum 6 items as per requirement 5.2 */}
      <nav className="primary-dashboard__nav" aria-label="Main navigation">
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('home')}
        >
          Home
        </Button>
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('health')}
        >
          Health
        </Button>
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('medications')}
        >
          Medications
        </Button>
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('appointments')}
        >
          Appointments
        </Button>
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('messages')}
        >
          Messages
        </Button>
        <Button
          variant="secondary"
          size="large"
          className="nav-button"
          onClick={() => handleNavigation('settings')}
        >
          Settings
        </Button>
      </nav>
    </div>
  );
};

/**
 * Primary User Dashboard for elderly users
 * Features:
 * - Large, clear widgets for health metrics, medications, appointments
 * - Prominent emergency alert button
 * - Family messages
 * - Maximum 6 main menu items for simplicity
 * - Voice navigation and text-to-speech guidance
 * 
 * Requirements: 5.2, 5.3, 5.5
 */
export const PrimaryUserDashboard: React.FC<PrimaryUserDashboardProps> = ({
  userId,
  userName,
  onEmergencyAlert,
  voiceNavigationEnabled = true,
}) => {
  return (
    <VoiceNavigationProvider
      enabled={voiceNavigationEnabled}
      language="en-US"
      onCommandRecognized={(command) => {
        console.log('Voice command recognized:', command);
      }}
      onError={(error) => {
        console.error('Voice navigation error:', error);
      }}
    >
      <DashboardContent
        userId={userId}
        userName={userName}
        onEmergencyAlert={onEmergencyAlert}
      />
    </VoiceNavigationProvider>
  );
};
