# Accessible Component Library

This component library provides elderly-friendly UI components designed specifically for the Healthcare Monitoring App. All components meet WCAG 2.1 AA accessibility standards and are optimized for users with limited technology experience.

## Requirements

**Validates: Requirements 5.1, 5.5**

- 5.1: Large fonts (minimum 18pt) and high contrast colors
- 5.5: Support for both touch and voice input

## Components

### Button

Large, high-contrast button component with minimum 44x44px touch target.

**Features:**
- Minimum touch target: 44x44px (WCAG 2.1 AA compliant)
- Large font size: 24px (18pt) minimum
- High contrast color variants
- Clear focus indicators
- Keyboard accessible

**Usage:**
```tsx
import { Button } from '@/components/accessible';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Save
</Button>

// Emergency button (high visibility)
<Button variant="emergency" size="extra-large" onClick={handleEmergency}>
  Emergency Alert
</Button>

// Success button
<Button variant="success" onClick={handleConfirm}>
  Confirm
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'emergency' | 'success'
- `size`: 'large' | 'extra-large'
- `ariaLabel`: Custom ARIA label for screen readers
- All standard button HTML attributes

### Text

Large, readable text component with high contrast colors.

**Features:**
- Minimum font size: 24px (18pt)
- High contrast color options
- Semantic HTML elements
- Flexible sizing and weights

**Usage:**
```tsx
import { Text } from '@/components/accessible';

// Heading
<Text variant="heading" as="h1">
  Health Dashboard
</Text>

// Body text
<Text variant="body" size="large">
  Your heart rate is normal.
</Text>

// Label
<Text variant="label" htmlFor="blood-pressure">
  Blood Pressure
</Text>

// Error message
<Text variant="body" color="error">
  Please enter a valid value.
</Text>
```

**Props:**
- `variant`: 'heading' | 'body' | 'label' | 'caption'
- `size`: 'normal' | 'large' | 'extra-large'
- `weight`: 'normal' | 'semibold' | 'bold'
- `color`: 'primary' | 'secondary' | 'error' | 'success' | 'warning'
- `as`: HTML element to render ('h1' | 'h2' | 'h3' | 'p' | 'span' | 'label')

### VoiceInput

Voice-to-text input component using Web Speech API.

**Features:**
- Large, accessible microphone button
- Real-time transcription display
- Visual listening indicator
- Error handling with clear messages
- Fallback for unsupported browsers

**Usage:**
```tsx
import { VoiceInput } from '@/components/accessible';

<VoiceInput
  label="Describe your symptoms"
  placeholder="Tap microphone to speak"
  onTranscript={(text) => setSymptoms(text)}
  onError={(error) => console.error(error)}
  continuous={false}
  language="en-US"
/>
```

**Props:**
- `onTranscript`: Callback with transcribed text
- `onError`: Error callback
- `placeholder`: Placeholder text
- `label`: Label for the input
- `continuous`: Enable continuous listening
- `language`: Speech recognition language (default: 'en-US')

### ThemeProvider

Context provider for high-contrast themes and font size control.

**Features:**
- Three theme modes: light, dark, high-contrast
- Three font sizes: normal, large, extra-large
- Persistent settings (localStorage)
- CSS custom properties for theming

**Usage:**
```tsx
import { ThemeProvider, useTheme } from '@/components/accessible';

// Wrap your app
function App() {
  return (
    <ThemeProvider defaultTheme="light" defaultFontSize="normal">
      <YourApp />
    </ThemeProvider>
  );
}

// Use theme in components
function Settings() {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  
  return (
    <div>
      <Button onClick={() => setTheme('high-contrast')}>
        High Contrast Mode
      </Button>
      <Button onClick={() => setFontSize('extra-large')}>
        Extra Large Text
      </Button>
    </div>
  );
}
```

## Theme System

### Color Themes

**Light Theme (Default)**
- High contrast colors (7:1 ratio)
- Black text on white background
- Blue primary color (#0066CC)
- Red emergency color (#CC0000)

**Dark Theme**
- High contrast colors (7:1 ratio)
- White text on black background
- Light blue primary color (#66B3FF)
- Light red emergency color (#FF6666)

**High Contrast Theme**
- Maximum contrast (21:1 ratio)
- Pure black and white
- Bright primary colors
- Yellow focus indicators

### Font Sizes

**Normal**: 24px base (18pt minimum)
**Large**: 28px base
**Extra Large**: 36px base

All sizes maintain WCAG 2.1 AA compliance for elderly users.

## Accessibility Features

### Touch Targets
- All interactive elements: minimum 44x44px
- Large buttons: 60x120px minimum
- Extra large buttons: 80x160px minimum

### Contrast Ratios
- Light/Dark themes: 7:1 (WCAG AAA)
- High contrast theme: 21:1 (maximum)
- Focus indicators: 4px yellow outline

### Keyboard Navigation
- All components fully keyboard accessible
- Clear focus indicators
- Logical tab order

### Screen Readers
- Semantic HTML elements
- ARIA labels and descriptions
- Live regions for dynamic content

### Motion
- Respects prefers-reduced-motion
- Optional animations
- No essential motion

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Voice input requires Web Speech API support

## Testing

All components include comprehensive unit tests covering:
- Rendering and props
- Accessibility features
- Touch target sizes
- Font sizes
- Keyboard navigation
- ARIA attributes

Run tests:
```bash
npm test
```

## Design Principles

1. **Simplicity**: Clear, uncluttered interfaces
2. **Contrast**: High contrast for visibility
3. **Size**: Large touch targets and text
4. **Feedback**: Clear visual and audio feedback
5. **Forgiveness**: Easy error recovery
6. **Consistency**: Predictable patterns

## Future Enhancements

- Additional input components (TextInput, Select, etc.)
- Voice navigation system
- Text-to-speech for all content
- Gesture-based controls
- Simplified navigation components
