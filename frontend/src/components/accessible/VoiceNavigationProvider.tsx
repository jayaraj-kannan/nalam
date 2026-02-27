import React, { createContext, useContext, useEffect } from 'react';
import { useVoiceNavigation, UseVoiceNavigationReturn } from '../../hooks/useVoiceNavigation';
import { VoiceCommand } from '../../services/VoiceNavigationService';

interface VoiceNavigationContextValue extends UseVoiceNavigationReturn {
  // Additional context-specific methods can be added here
}

const VoiceNavigationContext = createContext<VoiceNavigationContextValue | null>(null);

export interface VoiceNavigationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  language?: string;
  onCommandRecognized?: (command: string) => void;
  onError?: (error: string) => void;
}

/**
 * Voice Navigation Provider
 * Provides voice navigation and text-to-speech capabilities to child components
 * Requirements: 5.3, 5.5
 */
export const VoiceNavigationProvider: React.FC<VoiceNavigationProviderProps> = ({
  children,
  enabled = false,
  language = 'en-US',
  onCommandRecognized,
  onError,
}) => {
  const voiceNav = useVoiceNavigation({
    enabled,
    language,
    onCommandRecognized,
    onError,
  });

  // Announce when voice navigation is ready
  useEffect(() => {
    if (enabled && voiceNav.isListening) {
      voiceNav.speakInstruction(
        'Voice navigation is ready. Say "help" to hear available commands.'
      );
    }
  }, [enabled]);

  return (
    <VoiceNavigationContext.Provider value={voiceNav}>
      {children}
    </VoiceNavigationContext.Provider>
  );
};

/**
 * Hook to access voice navigation context
 */
export function useVoiceNavigationContext(): VoiceNavigationContextValue {
  const context = useContext(VoiceNavigationContext);
  
  if (!context) {
    throw new Error(
      'useVoiceNavigationContext must be used within a VoiceNavigationProvider'
    );
  }
  
  return context;
}

/**
 * Hook to register voice commands for a component
 */
export function useVoiceCommands(commands: VoiceCommand[]): void {
  const { registerCommand, unregisterCommand } = useVoiceNavigationContext();

  useEffect(() => {
    // Register all commands
    commands.forEach(command => {
      registerCommand(command);
    });

    // Cleanup: unregister commands when component unmounts
    return () => {
      commands.forEach(command => {
        unregisterCommand(command.command);
      });
    };
  }, [commands, registerCommand, unregisterCommand]);
}
