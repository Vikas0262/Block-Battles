import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'secondary',
  fullWidth = false,
  disabled = false,
  className = '',
  style = {}
}) => {
  const baseClasses = `
    font-bold text-white transition-all duration-300 rounded-xl
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  const variantClasses = {
    primary: 'py-3 text-lg bg-white/10 backdrop-blur-xl border-2 border-white/20 hover:border-pink-400 hover:bg-white/20 active:scale-95',
    secondary: 'px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 hover:border-white/30 hover:bg-white/15',
    ghost: 'px-4 py-2 text-sm bg-transparent border border-white/20 hover:bg-white/10'
  };

  const variantStyle = {
    primary: { boxShadow: '0 4px 12px rgba(255, 0, 128, 0.2)' },
    secondary: {},
    ghost: {}
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ ...variantStyle[variant], ...style }}
    >
      {children}
    </button>
  );
};

export default Button;
