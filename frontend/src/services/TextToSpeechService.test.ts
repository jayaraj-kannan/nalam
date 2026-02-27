import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TextToSpeechService } from './TextToSpeechService';

// Mock SpeechSynthesis API
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
  private currentUtterance: MockSpeechSynthesisUtterance | null = null;

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    this.currentUtterance = utterance;

    // Simulate async speech
    setTimeout(() => {
      if (utterance.onstart) {
        utterance.onstart(new Event('start'));
      }

      setTimeout(() => {
        this.speaking = false;
        if (utterance.onend) {
          utterance.onend(new Event('end'));
        }
      }, 100);
    }, 10);
  }

  cancel() {
    this.speaking = false;
    this.paused = false;
    this.currentUtterance = null;
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
      {
        voiceURI: 'es-ES-1',
        name: 'Spanish (Spain)',
        lang: 'es-ES',
        localService: true,
        default: false,
      } as SpeechSynthesisVoice,
    ];
  }
}

describe('TextToSpeechService', () => {
  let mockSynthesis: MockSpeechSynthesis;
  let service: TextToSpeechService;
  let onStart: ReturnType<typeof vi.fn>;
  let onEnd: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSynthesis = new MockSpeechSynthesis();
    (window as any).speechSynthesis = mockSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    onStart = vi.fn();
    onEnd = vi.fn();
    onError = vi.fn();

    service = new TextToSpeechService({
      language: 'en-US',
      rate: 0.9,
      onStart,
      onEnd,
      onError,
    });
  });

  afterEach(() => {
    service.cancel();
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
  });

  describe('Basic Speech', () => {
    it('should speak text', async () => {
      service.speak('Hello world');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(onStart).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it('should not speak empty text', () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');
      
      service.speak('');
      service.speak('   ');

      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('should apply custom speech options', async () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');

      service.speak('Test', {
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(1.5);
      expect(utterance.pitch).toBe(1.2);
      expect(utterance.volume).toBe(0.8);
    });
  });

  describe('Speech Queue', () => {
    it('should queue multiple speech requests', async () => {
      service.enqueue('First message');
      service.enqueue('Second message');
      service.enqueue('Third message');

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(onStart).toHaveBeenCalledTimes(3);
      expect(onEnd).toHaveBeenCalledTimes(3);
    });
  });

  describe('Speech Control', () => {
    it('should pause speech', () => {
      const pauseSpy = vi.spyOn(mockSynthesis, 'pause');
      
      service.speak('Test message');
      service.pause();

      expect(pauseSpy).toHaveBeenCalled();
    });

    it('should resume paused speech', () => {
      const resumeSpy = vi.spyOn(mockSynthesis, 'resume');
      
      mockSynthesis.paused = true;
      service.resume();

      expect(resumeSpy).toHaveBeenCalled();
    });

    it('should cancel speech', () => {
      const cancelSpy = vi.spyOn(mockSynthesis, 'cancel');
      
      service.speak('Test message');
      service.cancel();

      expect(cancelSpy).toHaveBeenCalled();
      expect(service.isActive()).toBe(false);
    });
  });

  describe('Specialized Speech Methods', () => {
    it('should speak notification with priority', async () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');

      service.speakNotification('Critical alert', 'critical');

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(1.0);
      expect(utterance.pitch).toBe(1.2);
    });

    it('should speak error with appropriate tone', async () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');

      service.speakError('An error occurred');

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(0.85);
      expect(utterance.pitch).toBe(0.9);
    });

    it('should speak instruction slowly', async () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');

      service.speakInstruction('Follow these steps');

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(0.8);
    });

    it('should read message naturally', async () => {
      const speakSpy = vi.spyOn(mockSynthesis, 'speak');

      service.readMessage('Hello from your family');

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as MockSpeechSynthesisUtterance;
      expect(utterance.rate).toBe(0.9);
    });
  });

  describe('Voice Selection', () => {
    it('should get available voices', () => {
      const voices = service.getVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0].lang).toBe('en-US');
    });

    it('should get preferred voice for language', () => {
      const voice = service.getPreferredVoice('en-US');
      expect(voice).toBeDefined();
      expect(voice?.lang).toBe('en-US');
    });

    it('should fallback to language code match', () => {
      const voice = service.getPreferredVoice('en-GB');
      expect(voice).toBeDefined();
      expect(voice?.lang.startsWith('en')).toBe(true);
    });
  });
});
