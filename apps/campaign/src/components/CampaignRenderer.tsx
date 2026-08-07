import { lazy, Suspense, type CSSProperties } from 'react';
import type { CampaignBlock, CampaignPageSchema } from '@shiguang/campaign-schema';
import { Loading } from '@shiguang/ui';
import styles from './CampaignRenderer.module.css';

const HeroBannerBlock = lazy(() =>
  import('../blocks/HeroBannerBlock').then((m) => ({ default: m.HeroBannerBlock })),
);
const CountdownBlock = lazy(() =>
  import('../blocks/CountdownBlock').then((m) => ({ default: m.CountdownBlock })),
);
const ProductGridBlock = lazy(() =>
  import('../blocks/ProductGridBlock').then((m) => ({ default: m.ProductGridBlock })),
);
const RichTextBlock = lazy(() =>
  import('../blocks/RichTextBlock').then((m) => ({ default: m.RichTextBlock })),
);
const CouponBannerBlock = lazy(() =>
  import('../blocks/CouponBannerBlock').then((m) => ({ default: m.CouponBannerBlock })),
);

export interface CampaignRendererProps {
  schema: CampaignPageSchema;
  slug: string;
  onBlockClick?: (block: CampaignBlock) => void;
}

function BlockFallback() {
  return (
    <div className={styles.blockFallback}>
      <Loading size="sm" />
    </div>
  );
}

function renderBlock(block: CampaignBlock, slug: string, onBlockClick?: (block: CampaignBlock) => void) {
  const handleClick = () => onBlockClick?.(block);

  switch (block.type) {
    case 'heroBanner':
      return (
        <Suspense fallback={<BlockFallback />}>
          <HeroBannerBlock block={block} onClick={handleClick} />
        </Suspense>
      );
    case 'countdown':
      return (
        <Suspense fallback={<BlockFallback />}>
          <CountdownBlock block={block} onClick={handleClick} />
        </Suspense>
      );
    case 'productGrid':
      return (
        <Suspense fallback={<BlockFallback />}>
          <ProductGridBlock block={block} slug={slug} onBlockClick={onBlockClick} />
        </Suspense>
      );
    case 'richText':
      return (
        <Suspense fallback={<BlockFallback />}>
          <RichTextBlock block={block} onClick={handleClick} />
        </Suspense>
      );
    case 'couponBanner':
      return (
        <Suspense fallback={<BlockFallback />}>
          <CouponBannerBlock block={block} onClick={handleClick} />
        </Suspense>
      );
    default:
      return null;
  }
}

export function CampaignRenderer({ schema, slug, onBlockClick }: CampaignRendererProps) {
  const pageStyle: CSSProperties = {
    backgroundColor: schema.theme?.backgroundColor,
    '--campaign-primary': schema.theme?.primaryColor,
  } as CSSProperties;

  return (
    <div className={styles.page} style={pageStyle}>
      <header className={styles.header}>
        <h1 className={styles.title}>{schema.title}</h1>
      </header>
      <main className={styles.blocks}>
        {schema.blocks.map((block: CampaignBlock) => (
          <section key={block.id} className={styles.block} data-block-id={block.id} data-block-type={block.type}>
            {renderBlock(block, slug, onBlockClick)}
          </section>
        ))}
      </main>
    </div>
  );
}
