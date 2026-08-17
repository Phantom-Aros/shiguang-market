import type { ButtonProps as TaroButtonProps } from '@tarojs/components';
import { Button as TaroButton, View } from '@tarojs/components';
import type { ReactNode } from 'react';
import './Button.scss';

export interface ButtonProps extends Omit<TaroButtonProps, 'type' | 'size'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'sg-btn',
    `sg-btn--${variant}`,
    `sg-btn--${size}`,
    block ? 'sg-btn--block' : '',
    loading ? 'sg-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TaroButton className={classes} disabled={disabled || loading} {...rest}>
      {loading && <View className="sg-btn__spinner" />}
      <View className="sg-btn__label">{children}</View>
    </TaroButton>
  );
}
