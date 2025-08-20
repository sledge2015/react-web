// src/components/common/Button/index.tsx
import React, { FC, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger'; // 👈 新增
  size?: 'small' | 'medium' | 'large'; // 👈 新增
}

export const Button: FC<ButtonProps> = ({
  children,
  loading = false,
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props
}) => {
  const buttonClass = [
    styles.button,
    styles[variant], // 对应 .primary / .secondary / .danger
    styles[size],    // 对应 .small / .medium / .large
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={buttonClass}
    >
      {loading ? '加载中...' : children}
    </button>
  );
};
