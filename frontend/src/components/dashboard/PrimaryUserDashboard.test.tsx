import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrimaryUserDashboard } from './PrimaryUserDashboard';
import { ThemeProvider } from '../accessible';

describe('PrimaryUserDashboard', () => {
  const defaultProps = {
    userId: 'user123',
    userName: 'John Doe',
  };

  const renderDashboard = (props = {}) => {
    return render(
      <ThemeProvider>
        <PrimaryUserDashboard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  it('renders dashboard with user greeting', () => {
    renderDashboard();
    expect(screen.getByText(/Hello, John Doe/i)).toBeInTheDocument();
  });

  it('renders all required widgets', () => {
    renderDashboard();
    
    // Check for widget headings using role
    const headings = screen.getAllByRole('heading', { level: 2 });
    const headingTexts = headings.map(h => h.textContent);
    
    expect(headingTexts).toContain('Health Metrics');
    expect(headingTexts).toContain('Medications');
    expect(headingTexts).toContain('Appointments');
    expect(headingTexts).toContain('Family Messages');
  });

  it('renders emergency alert button prominently', () => {
    renderDashboard();
    
    const emergencyButton = screen.getByRole('button', { name: /emergency/i });
    expect(emergencyButton).toBeInTheDocument();
    expect(emergencyButton).toHaveClass('emergency-button');
  });

  it('renders navigation with maximum 6 menu items', () => {
    renderDashboard();
    
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const navButtons = nav.querySelectorAll('button');
    
    // Requirement 5.2: Maximum 6 main menu items
    expect(navButtons.length).toBeLessThanOrEqual(6);
    expect(navButtons.length).toBe(6);
  });

  it('navigation includes expected menu items', () => {
    renderDashboard();
    
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /health/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /appointments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /messages/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('calls onEmergencyAlert callback when emergency button is clicked', async () => {
    const onEmergencyAlert = vi.fn();
    renderDashboard({ onEmergencyAlert });
    
    const emergencyButton = screen.getByRole('button', { name: /emergency/i });
    emergencyButton.click();
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(onEmergencyAlert).toHaveBeenCalled();
  });

  it('has accessible structure with proper headings', () => {
    renderDashboard();
    
    // Main heading
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    
    // Widget headings
    const widgetHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(widgetHeadings.length).toBeGreaterThan(0);
  });

  it('renders with proper ARIA labels for accessibility', () => {
    renderDashboard();
    
    const emergencyButton = screen.getByRole('button', { name: /emergency alert/i });
    expect(emergencyButton).toHaveAttribute('aria-label');
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });
});
