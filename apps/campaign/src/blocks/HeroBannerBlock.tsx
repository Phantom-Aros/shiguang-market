import type { HeroBannerBlock as HeroBannerBlockType } from '@shiguang/campaign-schema';
import { Image } from '@shiguang/ui';
import styles from './HeroBannerBlock.module.css';

export interface HeroBannerBlockProps {
  block: HeroBannerBlockType;
  onClick?: () => void;
}

export function HeroBannerBlock({ block, onClick }: HeroBannerBlockProps) {
  const { imageUrl, title, subtitle, linkUrl, height = 180 } = block.props;

  const content = (
    <div className={styles.hero} style={{ minHeight: height }} onClick={onClick} role="presentation">
      <Image src={imageUrl} alt={title} aspectRatio={`750 / ${height}`} className={styles.image} />
      <div className={styles.overlay}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} className={styles.link} onClick={onClick}>
        {content}
      </a>
    );
  }

  return content;
}
