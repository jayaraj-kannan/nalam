import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Text } from './Text';
import './VoiceInput.css';

export interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  label?: string;
  continuous?: boolean;
  language?: string;
}

/**
 * Voice input component using Web Speech API
 * Provides voice-to-text functionality for elderly users
 */
export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  placeholder = 'Tap microphone to speak',
  label,
  continuous = false,
  language = 'en-US',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      onError?.('Voice input is not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice input error occurred';
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
      
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (continuous && recognitionRef.current) {
        // Restart if continuous mode is enabled
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, language, onTranscript, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        onError?.('Failed to start voice input');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-input voice-input--unsupported">
        <Text variant="body" color="error">
          Voice input is not supported in this browser
        </Text>
      </div>
    );
  }

  return (
    <div className="voice-input">
      {label && (
        <Text variant="label" className="voice-input__label">
          {label}
        </Text>
      )}
      
      <div className="voice-input__container">
        <Button
          variant={isListening ? 'emergency' : 'primary'}
          size="extra-large"
          onClick={isListening ? stopListening : startListening}
          ariaLabel={isListening ? 'Stop listening' : 'Start voice input'}
          className="voice-input__button"
        >
          <span className="voice-input__icon" aria-hidden="true">
            {isListening ? '⏹' : '🎤'}
          </span>
          <span>{isListening ? 'Stop' : 'Speak'}</span>
        </Button>

        <div className="voice-input__transcript">
          {transcript ? (
            <Text variant="body" className="voice-input__text">
              {transcript}
            </Text>
          ) : (
            <Text variant="body" color="secondary" className="voice-input__placeholder">
              {placeholder}
            </Text>
          )}
        </div>

        {isListening && (
          <div className="voice-input__indicator" aria-live="polite">
            <span className="voice-input__pulse"></span>
            <Text variant="caption" color="primary">
              Listening...
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
}
