/**
 * Text-to-Speech Service
 * Provides voice output for reading notifications, messages, and instructions
 * Requirements: 5.3, 5.5
 */

export interface TextToSpeechOptions {
  language?: string;
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voice?: SpeechSynthesisVoice;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class TextToSpeechService {
  private synthesis: SpeechSynthesis;
  private defaultOptions: TextToSpeechOptions;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private queue: string[] = [];

  constructor(options: TextToSpeechOptions = {}) {
    if (!window.speechSynthesis) {
      throw new Error('Text-to-speech is not supported in this browser');
    }

    this.synthesis = window.speechSynthesis;
    this.defaultOptions = {
      language: 'en-US',
      rate: 0.9, // Slightly slower for elderly users
      pitch: 1,
      volume: 1,
      ...options,
    };
  }

  /**
   * Speak the given text
   */
  speak(text: string, options: TextToSpeechOptions = {}): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Cancel any ongoing speech
    this.cancel();

    const mergedOptions = { ...this.defaultOptions, ...options };
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = mergedOptions.language || 'en-US';
    utterance.rate = mergedOptions.rate || 0.9;
    utterance.pitch = mergedOptions.pitch || 1;
    utterance.volume = mergedOptions.volume || 1;

    if (mergedOptions.voice) {
      utterance.voice = mergedOptions.voice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      mergedOptions.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      mergedOptions.onEnd?.();

      // Process next item in queue
      if (this.queue.length > 0) {
        const nextText = this.queue.shift();
        if (nextText) {
          this.speak(nextText, options);
        }
      }
    };

    utterance.onerror = (event) => {
      console.error('Text-to-speech error:', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      mergedOptions.onError?.('Failed to speak text');
    };

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  /**
   * Add text to the speech queue
   */
  enqueue(text: string): void {
    if (this.isSpeaking) {
      this.queue.push(text);
    } else {
      this.speak(text);
    }
  }

  /**
   * Pause the current speech
   */
  pause(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Cancel the current speech and clear queue
   */
  cancel(): void {
    this.synthesis.cancel();
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.queue = [];
  }

  /**
   * Check if currently speaking
   */
  isActive(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  /**
   * Get preferred voice for the given language
   */
  getPreferredVoice(language: string = 'en-US'): SpeechSynthesisVoice | undefined {
    const voices = this.getVoices();
    
    // Try to find a voice that matches the language
    const matchingVoice = voices.find(voice => voice.lang === language);
    
    if (matchingVoice) {
      return matchingVoice;
    }

    // Fallback to any voice with the same language code
    const languageCode = language.split('-')[0];
    return voices.find(voice => voice.lang.startsWith(languageCode));
  }

  /**
   * Speak notification with appropriate tone
   */
  speakNotification(message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const options: TextToSpeechOptions = { ...this.defaultOptions };

    // Adjust speech parameters based on priority
    switch (priority) {
      case 'critical':
        options.rate = 1.0;
        options.volume = 1.0;
        options.pitch = 1.2;
        break;
      case 'high':
        options.rate = 0.95;
        options.volume = 1.0;
        options.pitch = 1.1;
        break;
      case 'medium':
        options.rate = 0.9;
        options.volume = 0.9;
        options.pitch = 1.0;
        break;
      case 'low':
        options.rate = 0.85;
        options.volume = 0.8;
        options.pitch = 0.9;
        break;
    }

    this.speak(message, options);
  }

  /**
   * Speak error message with appropriate tone
   */
  speakError(message: string): void {
    this.speak(message, {
      ...this.defaultOptions,
      rate: 0.85,
      pitch: 0.9,
    });
  }

  /**
   * Speak instruction with clear, slow pace
   */
  speakInstruction(instruction: string): void {
    this.speak(instruction, {
      ...this.defaultOptions,
      rate: 0.8, // Slower for instructions
      pitch: 1.0,
    });
  }

  /**
   * Read a message with natural tone
   */
  readMessage(message: string): void {
    this.speak(message, {
      ...this.defaultOptions,
      rate: 0.9,
      pitch: 1.0,
    });
  }
}
