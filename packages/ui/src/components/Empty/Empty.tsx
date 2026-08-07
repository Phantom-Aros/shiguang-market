import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import styles from './Empty.module.css';

export interface EmptyProps {
  title?: string;
  description?: string;
  image?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function DefaultImage() {
  return (
    <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden>
      <rect x="20" y="10" width="80" height="50" rx="8" fill="var(--sg-color-border-light)" />
      <circle cx="45" cy="30" r="8" fill="var(--sg-color-border)" />
      <rect x="58" y="24" width="30" height="6" rx="3" fill="var(--sg-color-border)" />
      <rect x="58" y="36" width="20" height="4" rx="2" fill="var(--sg-color-border-light)" />
    </svg>
  );
}

export function Empty({
  title = '暂无内容',
  description,
  image,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn(styles.empty, className)}>
      <div className={styles.image}>{image ?? <DefaultImage />}</div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
