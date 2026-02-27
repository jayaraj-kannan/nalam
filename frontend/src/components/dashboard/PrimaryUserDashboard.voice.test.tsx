import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PrimaryUserDashboard } from './PrimaryUserDashboard';

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
}

class MockSpeechSynthesisUtterance {
  text = '';
  lang = 'en-US';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  speaking = false;
  paused = false;
  pending = false;

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    setTimeout(() => {
      if (utterance.onstart) {
        utterance.onstart(new Event('start'));
      }
      setTimeout(() => {
        this.speaking = false;
        if (utterance.onend) {
          utterance.onend(new Event('end'));
        }
      }, 10);
    }, 10);
  }

  cancel() {
    this.speaking = false;
    this.paused = false;
  }

  pause() {
    if (this.speaking) {
      this.paused = true;
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false;
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return [
      {
        voiceURI: 'en-US-1',
        name: 'English (US)',
        lang: 'en-US',
        localService: true,
        default: true,
      } as SpeechSynthesisVoice,
    ];
  }
}

describe('PrimaryUserDashboard - Voice Navigation', () => {
  let mockRecognition: MockSpeechRecognition;
  let mockSynthesis: MockSpeechSynthesis;

  beforeEach(() => {
    // Setup mocks
    mockRecognition = new MockSpeechRecognition();
    mockSynthesis = new MockSpeechSynthesis();

    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    (window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;
    (window as any).speechSynthesis = mockSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
  });

  it('should render dashboard with voice navigation enabled', () => {
    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    expect(screen.getByText('Hello, John')).toBeInTheDocument();
  });

  it('should initialize voice navigation when enabled', async () => {
    const startSpy = vi.spyOn(mockRecognition, 'start');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalled();
    });
  });

  it('should announce voice navigation is ready', async () => {
    const speakSpy = vi.spyOn(mockSynthesis, 'speak');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    await waitFor(() => {
      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.text).toContain('Voice navigation is ready');
    });
  });

  it('should handle "help" voice command', async () => {
    const speakSpy = vi.spyOn(mockSynthesis, 'speak');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    await waitFor(() => {
      expect(mockRecognition.onresult).toBeDefined();
    });

    // Simulate "help" command
    mockRecognition.simulateResult('help');

    await waitFor(() => {
      const calls = speakSpy.mock.calls;
      const helpCall = calls.find(call => {
        const utterance = call[0] as MockSpeechSynthesisUtterance;
        return utterance.text.includes('You can say');
      });
      expect(helpCall).toBeDefined();
    });
  });

  it('should handle "show health" voice command', async () => {
    const speakSpy = vi.spyOn(mockSynthesis, 'speak');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    await waitFor(() => {
      expect(mockRecognition.onresult).toBeDefined();
    });

    // Simulate "show health" command
    mockRecognition.simulateResult('show health');

    await waitFor(() => {
      const calls = speakSpy.mock.calls;
      const healthCall = calls.find(call => {
        const utterance = call[0] as MockSpeechSynthesisUtterance;
        return utterance.text.includes('health');
      });
      expect(healthCall).toBeDefined();
    });
  });

  it('should handle "emergency" voice command', async () => {
    const onEmergencyAlert = vi.fn();
    const speakSpy = vi.spyOn(mockSynthesis, 'speak');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
        onEmergencyAlert={onEmergencyAlert}
      />
    );

    await waitFor(() => {
      expect(mockRecognition.onresult).toBeDefined();
    });

    // Simulate "emergency" command
    mockRecognition.simulateResult('emergency');

    await waitFor(() => {
      expect(onEmergencyAlert).toHaveBeenCalled();
      const calls = speakSpy.mock.calls;
      const emergencyCall = calls.find(call => {
        const utterance = call[0] as MockSpeechSynthesisUtterance;
        return utterance.text.includes('Emergency alert');
      });
      expect(emergencyCall).toBeDefined();
    });
  });

  it('should handle navigation commands', async () => {
    const speakSpy = vi.spyOn(mockSynthesis, 'speak');

    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={true}
      />
    );

    await waitFor(() => {
      expect(mockRecognition.onresult).toBeDefined();
    });

    // Test multiple navigation commands
    const commands = [
      'show medications',
      'show appointments',
      'show messages',
      'go home',
    ];

    for (const command of commands) {
      mockRecognition.simulateResult(command);
      await waitFor(() => {
        expect(speakSpy).toHaveBeenCalled();
      });
    }
  });

  it('should work without voice navigation when disabled', () => {
    render(
      <PrimaryUserDashboard
        userId="user123"
        userName="John"
        voiceNavigationEnabled={false}
      />
    );

    expect(screen.getByText('Hello, John')).toBeInTheDocument();
  });
});
