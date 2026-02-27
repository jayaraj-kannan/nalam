import React, { useState } from 'react';
import { Button, Text, VoiceInput, ThemeProvider, useTheme } from './index';

/**
 * Demo component showcasing the accessible component library
 * This demonstrates how to use the elderly-friendly components
 */
const AccessibleDemoContent: React.FC = () => {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  const [voiceText, setVoiceText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleVoiceTranscript = (transcript: string) => {
    setVoiceText(transcript);
    setErrorMessage('');
  };

  const handleVoiceError = (error: string) => {
    setErrorMessage(error);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Text variant="heading" as="h1">
        Accessible Component Demo
      </Text>

      <div style={{ marginTop: '32px' }}>
        <Text variant="heading" as="h2">
          Theme Settings
        </Text>
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          <Button
            variant={theme === 'light' ? 'primary' : 'secondary'}
            onClick={() => setTheme('light')}
          >
            Light Theme
          </Button>
          <Button
            variant={theme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => setTheme('dark')}
          >
            Dark Theme
          </Button>
          <Button
            variant={theme === 'high-contrast' ? 'primary' : 'secondary'}
            onClick={() => setTheme('high-contrast')}
          >
            High Contrast
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          <Button
            variant={fontSize === 'normal' ? 'primary' : 'secondary'}
            onClick={() => setFontSize('normal')}
          >
            Normal Text
          </Button>
          <Button
            variant={fontSize === 'large' ? 'primary' : 'secondary'}
            onClick={() => setFontSize('large')}
          >
            Large Text
          </Button>
          <Button
            variant={fontSize === 'extra-large' ? 'primary' : 'secondary'}
            onClick={() => setFontSize('extra-large')}
          >
            Extra Large
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <Text variant="heading" as="h2">
          Button Examples
        </Text>
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          <Button variant="primary">
            Primary Button
          </Button>
          <Button variant="secondary">
            Secondary Button
          </Button>
          <Button variant="success">
            Success Button
          </Button>
          <Button variant="emergency" size="extra-large">
            🚨 Emergency
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <Text variant="heading" as="h2">
          Text Examples
        </Text>
        
        <Text variant="body" size="normal">
          This is normal body text (24px minimum).
        </Text>
        <Text variant="body" size="large">
          This is large body text (28px).
        </Text>
        <Text variant="body" size="extra-large">
          This is extra large body text (36px).
        </Text>
        
        <div style={{ marginTop: '16px' }}>
          <Text variant="body" color="primary">
            Primary color text
          </Text>
          <Text variant="body" color="error">
            Error message text
          </Text>
          <Text variant="body" color="success">
            Success message text
          </Text>
          <Text variant="body" color="warning">
            Warning message text
          </Text>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <Text variant="heading" as="h2">
          Voice Input Example
        </Text>
        
        <VoiceInput
          label="Try voice input"
          placeholder="Tap the microphone and speak"
          onTranscript={handleVoiceTranscript}
          onError={handleVoiceError}
        />

        {voiceText && (
          <div style={{ marginTop: '16px' }}>
            <Text variant="label">You said:</Text>
            <Text variant="body" color="success">
              {voiceText}
            </Text>
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: '16px' }}>
            <Text variant="body" color="error">
              {errorMessage}
            </Text>
          </div>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <Text variant="heading" as="h2">
          Accessibility Features
        </Text>
        
        <ul style={{ marginTop: '16px' }}>
          <li>
            <Text variant="body">
              ✓ Minimum 44x44px touch targets
            </Text>
          </li>
          <li>
            <Text variant="body">
              ✓ Minimum 18pt (24px) font size
            </Text>
          </li>
          <li>
            <Text variant="body">
              ✓ High contrast colors (WCAG AAA)
            </Text>
          </li>
          <li>
            <Text variant="body">
              ✓ Voice input support
            </Text>
          </li>
          <li>
            <Text variant="body">
              ✓ Keyboard navigation
            </Text>
          </li>
          <li>
            <Text variant="body">
              ✓ Screen reader compatible
            </Text>
          </li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Demo component wrapped with ThemeProvider
 */
export const AccessibleDemo: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light" defaultFontSize="normal">
      <AccessibleDemoContent />
    </ThemeProvider>
  );
};
