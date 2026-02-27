import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceNavigationService, VoiceCommand } from './VoiceNavigationService';

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onresult: ((event: any) => void) | null = null;

  start() {
    if (this.onstart) {
      this.onstart(new Event('start'));
    }
  }

  stop() {
    if (this.onend) {
      this.onend(new Event('end'));
    }
  }

  abort() {
    this.stop();
  }

  // Helper method to simulate speech recognition result
  simulateResult(transcript: string, isFinal: boolean = true) {
    if (this.onresult) {
      const event = {
        resultIndex: 0,
        results: [
          {
            0: { transcript, confidence: 0.9 },
            isFinal,
            length: 1,
            item: (index: number) => ({ transcript, confidence: 0.9 }),
          },
        ],
      };
      this.onresult(event);
    }
  }

  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ error, message: error });
    }
  }
}

describe('VoiceNavigationService', () => {
  let mockRecognition: MockSpeechRecognition;
  let service: VoiceNavigationService;
  let onCommandRecognized: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mock
    mockRecognition = new MockSpeechRecognition();
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    (window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;

    onCommandRecognized = vi.fn();
    onError = vi.fn();

    service = new VoiceNavigationService({
      language: 'en-US',
      continuous: true,
      onCommandRecognized,
      onError,
    });
  });

  afterEach(() => {
    service.destroy();
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  describe('Command Registration', () => {
    it('should register a voice command', () => {
      const command: VoiceCommand = {
        command: 'go home',
        aliases: ['home'],
        action: vi.fn(),
        description: 'Navigate to home',
      };

      service.registerCommand(command);
      const commands = service.getCommands();

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('go home');
    });

    it('should register command aliases', () => {
      const action = vi.fn();
      const command: VoiceCommand = {
        command: 'show health',
        aliases: ['health', 'my health'],
        action,
        description: 'View health metrics',
      };

      service.registerCommand(command);
      service.start();

      // Test main command
      mockRecognition.simulateResult('show health');
      expect(action).toHaveBeenCalledTimes(1);

      // Test alias
      mockRecognition.simulateResult('health');
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('should unregister a command', () => {
      const command: VoiceCommand = {
        command: 'test command',
        aliases: [],
        action: vi.fn(),
        description: 'Test',
      };

      service.registerCommand(command);
      expect(service.getCommands()).toHaveLength(1);

      service.unregisterCommand('test command');
      expect(service.getCommands()).toHaveLength(0);
    });
  });

  describe('Voice Recognition', () => {
    it('should start listening for commands', () => {
      service.start();
      expect(service.isActive()).toBe(true);
    });

    it('should stop listening for commands', () => {
      service.start();
      service.stop();
      expect(service.isActive()).toBe(false);
    });

    it('should execute command when recognized', () => {
      const action = vi.fn();
      const command: VoiceCommand = {
        command: 'emergency',
        aliases: ['help'],
        action,
        description: 'Emergency alert',
      };

      service.registerCommand(command);
      service.start();

      mockRecognition.simulateResult('emergency');

      expect(action).toHaveBeenCalledTimes(1);
      expect(onCommandRecognized).toHaveBeenCalledWith('emergency');
    });

    it('should handle partial command matches', () => {
      const action = vi.fn();
      const command: VoiceCommand = {
        command: 'show medications',
        aliases: [],
        action,
        description: 'View medications',
      };

      service.registerCommand(command);
      service.start();

      mockRecognition.simulateResult('medications');

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should report error for unrecognized commands', () => {
      service.start();
      mockRecognition.simulateResult('unknown command');

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Command not recognized')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle no-speech error', () => {
      service.start();
      mockRecognition.simulateError('no-speech');

      expect(onError).toHaveBeenCalledWith(
        'No speech detected. Please try again.'
      );
    });

    it('should handle audio-capture error', () => {
      service.start();
      mockRecognition.simulateError('audio-capture');

      expect(onError).toHaveBeenCalledWith(
        'Microphone not available. Please check permissions.'
      );
    });

    it('should handle not-allowed error', () => {
      service.start();
      mockRecognition.simulateError('not-allowed');

      expect(onError).toHaveBeenCalledWith(
        'Microphone access denied. Please allow microphone access.'
      );
    });

    it('should handle network error', () => {
      service.start();
      mockRecognition.simulateError('network');

      expect(onError).toHaveBeenCalledWith(
        'Network error. Please check your connection.'
      );
    });
  });

  describe('Continuous Mode', () => {
    it('should auto-restart in continuous mode', () => {
      const startSpy = vi.spyOn(mockRecognition, 'start');
      
      service.start();
      expect(startSpy).toHaveBeenCalledTimes(1);

      // Simulate recognition end
      mockRecognition.stop();

      // Should auto-restart
      expect(startSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const command: VoiceCommand = {
        command: 'test',
        aliases: [],
        action: vi.fn(),
        description: 'Test',
      };

      service.registerCommand(command);
      service.start();

      service.destroy();

      expect(service.isActive()).toBe(false);
      expect(service.getCommands()).toHaveLength(0);
    });
  });
});
