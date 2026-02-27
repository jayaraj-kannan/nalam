import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

// Test component that uses the theme context
const ThemeConsumer = () => {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="current-font-size">{fontSize}</div>
      <button onClick={() => setTheme('dark')}>Set Dark Theme</button>
      <button onClick={() => setTheme('high-contrast')}>Set High Contrast</button>
      <button onClick={() => setFontSize('large')}>Set Large Font</button>
      <button onClick={() => setFontSize('extra-large')}>Set Extra Large Font</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Mock localStorage with proper implementation
    const storage: Record<string, string> = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
    };
    global.localStorage = localStorageMock as any;
    
    // Reset document class
    document.documentElement.className = '';
  });

  it('provides default theme and font size', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('current-font-size')).toHaveTextContent('normal');
  });

  it('applies custom default theme', () => {
    render(
      <ThemeProvider defaultTheme="dark" defaultFontSize="large">
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('current-font-size')).toHaveTextContent('large');
  });

  it('changes theme when setTheme is called', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByText('Set Dark Theme'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    
    fireEvent.click(screen.getByText('Set High Contrast'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('high-contrast');
  });

  it('changes font size when setFontSize is called', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByText('Set Large Font'));
    expect(screen.getByTestId('current-font-size')).toHaveTextContent('large');
    
    fireEvent.click(screen.getByText('Set Extra Large Font'));
    expect(screen.getByTestId('current-font-size')).toHaveTextContent('extra-large');
  });

  it('applies theme class to document root', () => {
    render(
      <ThemeProvider defaultTheme="dark" defaultFontSize="large">
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    expect(document.documentElement.className).toContain('theme-dark');
    expect(document.documentElement.className).toContain('font-size-large');
  });

  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByText('Set Dark Theme'));
    expect(localStorage.getItem('healthcare-theme')).toBe('dark');
    
    fireEvent.click(screen.getByText('Set Large Font'));
    expect(localStorage.getItem('healthcare-font-size')).toBe('large');
  });

  it('loads theme from localStorage on mount', () => {
    localStorage.setItem('healthcare-theme', 'high-contrast');
    localStorage.setItem('healthcare-font-size', 'extra-large');
    
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('high-contrast');
    expect(screen.getByTestId('current-font-size')).toHaveTextContent('extra-large');
  });

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};
    
    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');
    
    console.error = originalError;
  });

  it('supports all theme modes', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    // Test light theme (default)
    expect(document.documentElement.className).toContain('theme-light');
    
    // Test dark theme
    fireEvent.click(screen.getByText('Set Dark Theme'));
    expect(document.documentElement.className).toContain('theme-dark');
    
    // Test high contrast theme
    fireEvent.click(screen.getByText('Set High Contrast'));
    expect(document.documentElement.className).toContain('theme-high-contrast');
  });

  it('supports all font sizes', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    
    // Test normal size (default)
    expect(document.documentElement.className).toContain('font-size-normal');
    
    // Test large size
    fireEvent.click(screen.getByText('Set Large Font'));
    expect(document.documentElement.className).toContain('font-size-large');
    
    // Test extra large size
    fireEvent.click(screen.getByText('Set Extra Large Font'));
    expect(document.documentElement.className).toContain('font-size-extra-large');
  });
});
