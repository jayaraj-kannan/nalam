import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';

describe('Accessible Text Component', () => {
  it('renders with children', () => {
    render(<Text>Hello World</Text>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { container, rerender } = render(<Text variant="heading">Heading</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--heading');

    rerender(<Text variant="body">Body</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--body');

    rerender(<Text variant="label">Label</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--label');
  });

  it('applies correct size classes', () => {
    const { container, rerender } = render(<Text size="normal">Normal</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--normal');

    rerender(<Text size="large">Large</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--large');

    rerender(<Text size="extra-large">Extra Large</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--extra-large');
  });

  it('applies correct color classes', () => {
    const { container, rerender } = render(<Text color="primary">Primary</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--primary');

    rerender(<Text color="error">Error</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--error');

    rerender(<Text color="success">Success</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--success');
  });

  it('renders as different HTML elements based on "as" prop', () => {
    const { container, rerender } = render(<Text as="h1">Heading 1</Text>);
    expect(container.querySelector('h1')).toBeInTheDocument();

    rerender(<Text as="span">Span Text</Text>);
    expect(container.querySelector('span')).toBeInTheDocument();

    rerender(<Text as="label">Label Text</Text>);
    expect(container.querySelector('label')).toBeInTheDocument();
  });

  it('defaults to h2 for heading variant', () => {
    const { container } = render(<Text variant="heading">Heading</Text>);
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  it('defaults to label element for label variant', () => {
    const { container } = render(<Text variant="label">Label</Text>);
    expect(container.querySelector('label')).toBeInTheDocument();
  });

  it('defaults to p element for body variant', () => {
    const { container } = render(<Text variant="body">Body</Text>);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('has accessible-text class for styling', () => {
    const { container } = render(<Text>Minimum Size</Text>);
    const element = container.firstChild as HTMLElement;
    
    // Check that text has the accessible-text class which applies minimum font size
    expect(element).toHaveClass('accessible-text');
  });

  it('applies custom className', () => {
    const { container } = render(<Text className="custom-class">Custom</Text>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies id attribute', () => {
    render(<Text id="test-id">Text with ID</Text>);
    expect(screen.getByText('Text with ID')).toHaveAttribute('id', 'test-id');
  });

  it('applies weight classes correctly', () => {
    const { container, rerender } = render(<Text weight="normal">Normal</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--normal');

    rerender(<Text weight="semibold">Semibold</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--semibold');

    rerender(<Text weight="bold">Bold</Text>);
    expect(container.firstChild).toHaveClass('accessible-text--bold');
  });
});
