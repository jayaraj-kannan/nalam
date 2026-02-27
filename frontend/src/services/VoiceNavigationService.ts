/**
 * Voice Navigation Service
 * Provides voice command recognition and navigation for elderly users
 * Requirements: 5.3, 5.5
 */

export interface VoiceCommand {
  command: string;
  aliases: string[];
  action: () => void;
  description: string;
}

export interface VoiceNavigationOptions {
  language?: string;
  continuous?: boolean;
  onCommandRecognized?: (command: string) => void;
  onError?: (error: string) => void;
}

export class VoiceNavigationService {
  private recognition: SpeechRecognition | null = null;
  private commands: Map<string, VoiceCommand> = new Map();
  private isListening: boolean = false;
  private options: VoiceNavigationOptions;

  constructor(options: VoiceNavigationOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      ...options,
    };

    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.options.onError?.('Voice navigation is not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.options.continuous || false;
    this.recognition.interimResults = false;
    this.recognition.lang = this.options.language || 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      this.processCommand(transcript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Voice navigation error:', event.error);
      this.isListening = false;

      let errorMessage = 'Voice navigation error occurred';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }

      this.options.onError?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if continuous mode is enabled
      if (this.options.continuous && this.recognition) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (error) {
          console.error('Failed to restart voice navigation:', error);
        }
      }
    };
  }

  /**
   * Register a voice command
   */
  registerCommand(command: VoiceCommand): void {
    // Register main command
    this.commands.set(command.command.toLowerCase(), command);

    // Register aliases
    command.aliases.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });
  }

  /**
   * Unregister a voice command
   */
  unregisterCommand(commandName: string): void {
    const command = this.commands.get(commandName.toLowerCase());
    if (command) {
      this.commands.delete(command.command.toLowerCase());
      command.aliases.forEach(alias => {
        this.commands.delete(alias.toLowerCase());
      });
    }
  }

  /**
   * Process recognized speech and execute matching command
   */
  private processCommand(transcript: string): void {
    console.log('Voice command received:', transcript);

    // Try exact match first
    let matchedCommand = this.commands.get(transcript);

    // If no exact match, try partial match
    if (!matchedCommand) {
      for (const [key, command] of this.commands.entries()) {
        if (transcript.includes(key) || key.includes(transcript)) {
          matchedCommand = command;
          break;
        }
      }
    }

    if (matchedCommand) {
      this.options.onCommandRecognized?.(matchedCommand.command);
      matchedCommand.action();
    } else {
      this.options.onError?.(`Command not recognized: "${transcript}". Please try again.`);
    }
  }

  /**
   * Start listening for voice commands
   */
  start(): void {
    if (!this.recognition) {
      this.options.onError?.('Voice navigation is not available');
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start voice navigation:', error);
      this.options.onError?.('Failed to start voice navigation');
    }
  }

  /**
   * Stop listening for voice commands
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if voice navigation is currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get all registered commands
   */
  getCommands(): VoiceCommand[] {
    const uniqueCommands = new Map<string, VoiceCommand>();
    this.commands.forEach((command) => {
      uniqueCommands.set(command.command, command);
    });
    return Array.from(uniqueCommands.values());
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.commands.clear();
    this.recognition = null;
  }
}
