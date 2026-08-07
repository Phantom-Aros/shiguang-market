import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import styles from './Countdown.module.css';

function getRemaining(endTime: number) {
  const diff = Math.max(0, endTime - Date.now());
  const finished = diff === 0;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    finished,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export interface CountdownProps {
  /** 结束时间戳（毫秒） */
  endTime: number;
  onFinish?: () => void;
  className?: string;
}

export function Countdown({ endTime, onFinish, className }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = getRemaining(endTime);
        if (!prev.finished && next.finished) onFinish?.();
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onFinish]);

  if (remaining.finished) {
    return <span className={cn(styles.countdown, className)}>已结束</span>;
  }

  return (
    <span className={cn(styles.countdown, className)}>
      {remaining.days > 0 && (
        <>
          <span className={styles.block}>{remaining.days}</span>
          <span className={styles.sep}>天</span>
        </>
      )}
      <span className={styles.block}>{pad(remaining.hours)}</span>
      <span className={styles.colon}>:</span>
      <span className={styles.block}>{pad(remaining.minutes)}</span>
      <span className={styles.colon}>:</span>
      <span className={styles.block}>{pad(remaining.seconds)}</span>
    </span>
  );
}
