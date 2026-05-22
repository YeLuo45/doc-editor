import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  className = '',
  style,
  ...props
}) => {
  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-primary)',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    width: '100%',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      style={inputStyle}
      className={className}
      {...props}
    />
  );
};
