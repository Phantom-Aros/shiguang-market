import { useCallback, useEffect, useState } from 'react';
import { build618ExampleSchema } from '@shiguang/campaign-schema';
import type { CampaignPageSchema } from '@shiguang/campaign-schema';
import { validateCampaignPageSchema } from '@shiguang/campaign-schema';
import { Button } from '@shiguang/ui';
import { CampaignRenderer } from '../components/CampaignRenderer';
import styles from './BuilderPage.module.css';

/** 搭建器预览专用占位 ID，对应 ProductGridBlock 本地 mock 数据 */
const PREVIEW_PRODUCT_IDS = ['preview-1', 'preview-2', 'preview-3', 'preview-4'];

const DEFAULT_SCHEMA: CampaignPageSchema = {
  title: '新活动页',
  theme: { primaryColor: '#ff4d4f', backgroundColor: '#fff5f5' },
  blocks: [
    {
      id: 'hero-1',
      type: 'heroBanner',
      props: {
        imageUrl: 'https://picsum.photos/seed/sg-builder/750/400',
        title: '活动主标题',
        subtitle: '副标题文案',
      },
    },
  ],
};

export function BuilderPage() {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [schema, setSchema] = useState<CampaignPageSchema>(DEFAULT_SCHEMA);
  const [error, setError] = useState<string | null>(null);

  const applyJson = useCallback((text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text) as unknown;
      const result = validateCampaignPageSchema(parsed);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSchema(result.data as unknown as CampaignPageSchema);
      setError(null);
    } catch {
      setError('JSON 格式错误');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => applyJson(jsonText), 400);
    return () => clearTimeout(timer);
  }, [jsonText, applyJson]);

  const load618Example = () => {
    const example = build618ExampleSchema(PREVIEW_PRODUCT_IDS);
    const text = JSON.stringify(example, null, 2);
    setJsonText(text);
    applyJson(text);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.editor}>
        <div className={styles.toolbar}>
          <h1 className={styles.heading}>活动页搭建器</h1>
          <Button size="sm" variant="secondary" onClick={load618Example}>
            加载 618 模板
          </Button>
        </div>
        <p className={styles.hint}>
          编辑 JSON Schema，右侧实时预览。预览商品使用 preview-* 占位 ID，发布前请替换为真实 productId。
        </p>
        <textarea
          className={styles.textarea}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        {error && <p className={styles.error}>{error}</p>}
      </aside>
      <main className={styles.preview}>
        <div className={styles.phone}>
          <CampaignRenderer schema={schema} slug="preview" />
        </div>
      </main>
    </div>
  );
}
