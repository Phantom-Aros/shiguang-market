import { cn } from '../../utils/cn';
import styles from './Loading.module.css';

const sizeMap = { sm: 20, md: 32, lg: 48 } as const;

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  tip?: string;
  block?: boolean;
  className?: string;
}

export function Loading({ size = 'md', tip, block = false, className }: LoadingProps) {
  const px = sizeMap[size];

  return (
    <div className={cn(styles.loading, block && styles.block, className)} role="status">
      <div
        className={styles.spinner}
        style={{ width: px, height: px }}
        aria-label={tip ?? '加载中'}
      />
      {tip && <p className={styles.tip}>{tip}</p>}
    </div>
  );
}
