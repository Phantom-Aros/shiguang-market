import type { CountdownBlock as CountdownBlockType } from '@shiguang/campaign-schema';
import { Countdown } from '@shiguang/ui';
import styles from './CountdownBlock.module.css';

export interface CountdownBlockProps {
  block: CountdownBlockType;
  onClick?: () => void;
}

export function CountdownBlock({ block, onClick }: CountdownBlockProps) {
  const { endTime, label } = block.props;

  return (
    <div className={styles.wrap} onClick={onClick} role="presentation">
      {label && <span className={styles.label}>{label}</span>}
      <Countdown endTime={endTime} className={styles.countdown} />
    </div>
  );
}
