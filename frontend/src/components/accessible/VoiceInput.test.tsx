import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceInput } from './VoiceInput';

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onresult: ((ev: any) => void) | null = null;

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
}

describe('VoiceInput Component', () => {
  beforeEach(() => {
    // Setup Web Speech API mock
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });

  it('renders with default placeholder', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    expect(screen.getByText('Tap microphone to speak')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} placeholder="Custom placeholder" />);
    
    expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
  });

  it('renders with label', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} label="Voice Input Label" />);
    
    expect(screen.getByText('Voice Input Label')).toBeInTheDocument();
  });

  it('shows speak button initially', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
    expect(screen.getByText('Speak')).toBeInTheDocument();
  });

  it('changes button text when listening', async () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    const button = screen.getByRole('button', { name: 'Start voice input' });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop listening' })).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });
  });

  it('shows listening indicator when active', async () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    const button = screen.getByRole('button', { name: 'Start voice input' });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });
  });

  it('displays error message when Web Speech API is not supported', () => {
    // Remove Web Speech API support
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    
    const onTranscript = vi.fn();
    const onError = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} onError={onError} />);
    
    expect(screen.getByText('Voice input is not supported in this browser')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Voice input is not supported in this browser');
  });

  it('has accessible button class for large touch target', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    const button = screen.getByRole('button');
    // Button should have accessible-button class which ensures minimum touch target
    expect(button).toHaveClass('accessible-button');
  });

  it('uses extra-large button size', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('accessible-button--extra-large');
  });

  it('applies correct ARIA labels', () => {
    const onTranscript = vi.fn();
    render(<VoiceInput onTranscript={onTranscript} />);
    
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
  });

  it('has transcript area with proper styling classes', () => {
    const onTranscript = vi.fn();
    const { container } = render(<VoiceInput onTranscript={onTranscript} />);
    
    const transcript = container.querySelector('.voice-input__transcript');
    expect(transcript).toBeInTheDocument();
    expect(transcript).toHaveClass('voice-input__transcript');
  });
});
