/**
 * Accessible Component Library for Healthcare Monitoring App
 * 
 * This library provides elderly-friendly components with:
 * - Large touch targets (minimum 44x44px)
 * - High contrast colors (WCAG AAA compliance)
 * - Large fonts (minimum 18pt/24px)
 * - Voice input support
 * - Voice navigation and text-to-speech
 * - Screen reader compatibility
 * 
 * Requirements: 5.1, 5.3, 5.5
 */

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Text } from './Text';
export type { TextProps } from './Text';

export { VoiceInput } from './VoiceInput';
export type { VoiceInputProps } from './VoiceInput';

export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode, FontSize } from './ThemeProvider';

export { VoiceNavigationProvider, useVoiceNavigationContext, useVoiceCommands } from './VoiceNavigationProvider';
export type { VoiceNavigationProviderProps } from './VoiceNavigationProvider';

export { ErrorDisplay } from './ErrorDisplay';
export type { ErrorDisplayProps } from './ErrorDisplay';

export { ErrorBoundary } from './ErrorBoundary';
