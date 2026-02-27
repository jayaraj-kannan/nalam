import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Accessible Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('accessible-button--primary');

    rerender(<Button variant="emergency">Emergency</Button>);
    expect(screen.getByRole('button')).toHaveClass('accessible-button--emergency');

    rerender(<Button variant="success">Success</Button>);
    expect(screen.getByRole('button')).toHaveClass('accessible-button--success');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('accessible-button--large');

    rerender(<Button size="extra-large">Extra Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('accessible-button--extra-large');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('uses custom aria-label when provided', () => {
    render(<Button ariaLabel="Custom Label">Button Text</Button>);
    expect(screen.getByRole('button', { name: 'Custom Label' })).toBeInTheDocument();
  });

  it('has accessible-button class for styling', () => {
    render(<Button>Touch Target</Button>);
    const button = screen.getByRole('button');
    
    // Check that button has the accessible-button class which applies minimum size
    expect(button).toHaveClass('accessible-button');
  });

  it('has large size class by default', () => {
    render(<Button>Large Text</Button>);
    const button = screen.getByRole('button');
    
    // Check that button has the large size class which applies minimum font size
    expect(button).toHaveClass('accessible-button--large');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('forwards additional props to button element', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
