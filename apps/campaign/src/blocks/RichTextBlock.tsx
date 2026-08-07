import type { RichTextBlock as RichTextBlockType } from '@shiguang/campaign-schema';
import styles from './RichTextBlock.module.css';

export interface RichTextBlockProps {
  block: RichTextBlockType;
  onClick?: () => void;
}

export function RichTextBlock({ block, onClick }: RichTextBlockProps) {
  return (
    <div className={styles.wrap} onClick={onClick} role="presentation">
      {block.props.content.split('\n').map((line: string, i: number) => (
        <p key={i} className={styles.line}>
          {line}
        </p>
      ))}
    </div>
  );
}
