import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceNavigationService, VoiceCommand } from '../services/VoiceNavigationService';
import { TextToSpeechService } from '../services/TextToSpeechService';

export interface UseVoiceNavigationOptions {
  enabled?: boolean;
  language?: string;
  onCommandRecognized?: (command: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceNavigationReturn {
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  registerCommand: (command: VoiceCommand) => void;
  unregisterCommand: (commandName: string) => void;
  speak: (text: string) => void;
  speakNotification: (message: string, priority?: 'low' | 'medium' | 'high' | 'critical') => void;
  speakError: (message: string) => void;
  speakInstruction: (instruction: string) => void;
  readMessage: (message: string) => void;
  cancelSpeech: () => void;
  commands: VoiceCommand[];
}

/**
 * Hook for voice navigation and text-to-speech functionality
 * Requirements: 5.3, 5.5
 */
export function useVoiceNavigation(
  options: UseVoiceNavigationOptions = {}
): UseVoiceNavigationReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);

  const voiceNavRef = useRef<VoiceNavigationService | null>(null);
  const ttsRef = useRef<TextToSpeechService | null>(null);

  // Initialize services
  useEffect(() => {
    try {
      // Initialize voice navigation
      voiceNavRef.current = new VoiceNavigationService({
        language: options.language || 'en-US',
        continuous: true,
        onCommandRecognized: (command) => {
          options.onCommandRecognized?.(command);
          // Provide audio feedback
          if (ttsRef.current) {
            ttsRef.current.speak(`${command} activated`, { rate: 1.2 });
          }
        },
        onError: (error) => {
          options.onError?.(error);
          // Speak error message
          if (ttsRef.current) {
            ttsRef.current.speakError(error);
          }
        },
      });

      // Initialize text-to-speech
      ttsRef.current = new TextToSpeechService({
        language: options.language || 'en-US',
        rate: 0.9,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: (error) => {
          setIsSpeaking(false);
          options.onError?.(error);
        },
      });

      // Auto-start if enabled
      if (options.enabled && voiceNavRef.current) {
        voiceNavRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Failed to initialize voice services:', error);
      options.onError?.('Voice services are not available in this browser');
    }

    // Cleanup
    return () => {
      if (voiceNavRef.current) {
        voiceNavRef.current.destroy();
      }
      if (ttsRef.current) {
        ttsRef.current.cancel();
      }
    };
  }, [options.enabled, options.language]);

  const startListening = useCallback(() => {
    if (voiceNavRef.current) {
      voiceNavRef.current.start();
      setIsListening(true);
      
      // Provide audio feedback
      if (ttsRef.current) {
        ttsRef.current.speak('Voice navigation activated', { rate: 1.2 });
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (voiceNavRef.current) {
      voiceNavRef.current.stop();
      setIsListening(false);
      
      // Provide audio feedback
      if (ttsRef.current) {
        ttsRef.current.speak('Voice navigation deactivated', { rate: 1.2 });
      }
    }
  }, []);

  const registerCommand = useCallback((command: VoiceCommand) => {
    if (voiceNavRef.current) {
      voiceNavRef.current.registerCommand(command);
      setCommands(voiceNavRef.current.getCommands());
    }
  }, []);

  const unregisterCommand = useCallback((commandName: string) => {
    if (voiceNavRef.current) {
      voiceNavRef.current.unregisterCommand(commandName);
      setCommands(voiceNavRef.current.getCommands());
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (ttsRef.current) {
      ttsRef.current.speak(text);
    }
  }, []);

  const speakNotification = useCallback(
    (message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
      if (ttsRef.current) {
        ttsRef.current.speakNotification(message, priority);
      }
    },
    []
  );

  const speakError = useCallback((message: string) => {
    if (ttsRef.current) {
      ttsRef.current.speakError(message);
    }
  }, []);

  const speakInstruction = useCallback((instruction: string) => {
    if (ttsRef.current) {
      ttsRef.current.speakInstruction(instruction);
    }
  }, []);

  const readMessage = useCallback((message: string) => {
    if (ttsRef.current) {
      ttsRef.current.readMessage(message);
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    if (ttsRef.current) {
      ttsRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    registerCommand,
    unregisterCommand,
    speak,
    speakNotification,
    speakError,
    speakInstruction,
    readMessage,
    cancelSpeech,
    commands,
  };
}
