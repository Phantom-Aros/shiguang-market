import { cn } from '../../utils/cn';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, circle = false, className }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height }}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <Skeleton height={160} />
      <div className={styles.cardBody}>
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="50%" />
      </div>
    </div>
  );
}
