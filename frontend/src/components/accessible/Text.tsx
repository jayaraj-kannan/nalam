import React from 'react';
import './Text.css';

export interface TextProps {
  variant?: 'heading' | 'body' | 'label' | 'caption';
  size?: 'normal' | 'large' | 'extra-large';
  weight?: 'normal' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'label';
  id?: string;
}

/**
 * Accessible text component with minimum 18pt font size
 * High contrast colors for elderly users
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  size = 'normal',
  weight = 'normal',
  color = 'primary',
  children,
  className = '',
  as,
  id,
}) => {
  const classes = `accessible-text accessible-text--${variant} accessible-text--${size} accessible-text--${weight} accessible-text--${color} ${className}`;

  // Determine the HTML element to use
  const Component = as || (variant === 'heading' ? 'h2' : variant === 'label' ? 'label' : 'p');

  return (
    <Component className={classes} id={id}>
      {children}
    </Component>
  );
};
