import { useToast } from '@shiguang/ui';
import type { CouponBannerBlock as CouponBannerBlockType } from '@shiguang/campaign-schema';
import styles from './CouponBannerBlock.module.css';

export interface CouponBannerBlockProps {
  block: CouponBannerBlockType;
  onClick?: () => void;
}

export function CouponBannerBlock({ block, onClick }: CouponBannerBlockProps) {
  const { title, description, code, backgroundColor } = block.props;
  const { success } = useToast();

  const handleClick = () => {
    onClick?.();
    if (code) {
      void navigator.clipboard.writeText(code);
      success('优惠券码已复制');
    }
  };

  return (
    <button
      type="button"
      className={styles.wrap}
      style={{ backgroundColor: backgroundColor ?? 'var(--campaign-primary, #ff4d4f)' }}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <strong className={styles.title}>{title}</strong>
        {description && <span className={styles.desc}>{description}</span>}
        {code && <span className={styles.code}>{code}</span>}
      </div>
      <span className={styles.action}>领取</span>
    </button>
  );
}
