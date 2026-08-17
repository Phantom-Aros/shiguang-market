import { Icon as IconifyIcon, type IconProps as IconifyIconProps } from '@iconify/react';
import { getIconifyId, type SemanticIconName } from '@shiguang/icons';

export type IconName = SemanticIconName;

export interface IconProps extends Omit<IconifyIconProps, 'icon' | 'width' | 'height'> {
  name: IconName;
  size?: number;
  /** 实心样式，用于激活态 */
  filled?: boolean;
}

/**
 * Web 端图标：基于 Iconify 按语义名渲染。
 * 换图标请改 @shiguang/icons 的 registry，无需手抄 path。
 */
export function Icon({ name, size = 20, filled = false, className, color, ...rest }: IconProps) {
  return (
    <IconifyIcon
      icon={getIconifyId(name, { filled })}
      width={size}
      height={size}
      className={className}
      color={color}
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    />
  );
}
