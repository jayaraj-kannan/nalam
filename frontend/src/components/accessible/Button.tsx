import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emergency' | 'success';
  size?: 'large' | 'extra-large';
  children: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Accessible button component with minimum 44x44px touch target
 * Meets WCAG 2.1 AA requirements for touch targets
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'large',
  children,
  ariaLabel,
  className = '',
  ...props
}) => {
  const classes = `accessible-button accessible-button--${variant} accessible-button--${size} ${className}`;

  return (
    <button
      className={classes}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {children}
    </button>
  );
};
