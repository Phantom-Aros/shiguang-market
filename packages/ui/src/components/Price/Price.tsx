import { cn } from '../../utils/cn';
import styles from './Price.module.css';

function formatCents(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export interface PriceProps {
  /** 现价，单位：分 */
  value: number;
  /** 原价，单位：分 */
  originalValue?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Price({ value, originalValue, size = 'md', className }: PriceProps) {
  const showOriginal = originalValue !== undefined && originalValue > value;

  return (
    <span className={cn(styles.price, styles[size], className)}>
      <span className={styles.currency}>¥</span>
      <span>{formatCents(value)}</span>
      {showOriginal && <span className={styles.original}>¥{formatCents(originalValue)}</span>}
    </span>
  );
}
