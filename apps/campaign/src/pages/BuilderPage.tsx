import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@shiguang/api-client';
import { build618ExampleSchema } from '@shiguang/campaign-schema';
import type { CampaignPageSchema } from '@shiguang/campaign-schema';
import { validateCampaignPageSchema } from '@shiguang/campaign-schema';
import type { CampaignSummary, CampaignVersion } from '@shiguang/shared';
import { Button, Loading, Modal, useToast } from '@shiguang/ui';
import { CampaignRenderer } from '../components/CampaignRenderer';
import { getWebLoginUrl } from '../lib/auth';
import { consumeAuthRedirectTokens } from '../lib/consumeAuthRedirect';
import styles from './BuilderPage.module.css';

/** 搭建器预览专用占位 ID，对应 ProductGridBlock 本地 mock 数据 */
const PREVIEW_PRODUCT_IDS = ['preview-1', 'preview-2', 'preview-3', 'preview-4'];

/** 内置示例模板（按 slug 注册，无模板的活动不显示「示例模板」按钮） */
const CAMPAIGN_TEMPLATE_BUILDERS: Record<string, () => CampaignPageSchema> = {
  '618-sale': () => build618ExampleSchema(PREVIEW_PRODUCT_IDS) as unknown as CampaignPageSchema,
};

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

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) return '请先登录后再操作';
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function BuilderPage() {
  const { success, error: toastError } = useToast();
  const [jsonText, setJsonText] = useState(() => JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [schema, setSchema] = useState<CampaignPageSchema>(DEFAULT_SCHEMA);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState<CampaignVersion[]>([]);

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', 'list'],
    queryFn: async () => {
      try {
        return await api.campaigns.list();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return { items: [] as CampaignSummary[] };
        }
        throw err;
      }
    },
  });

  const campaigns = campaignsQuery.data?.items ?? [];

  useEffect(() => {
    if (consumeAuthRedirectTokens()) {
      void campaignsQuery.refetch();
    }
  }, [campaignsQuery]);

  const loginUrl = getWebLoginUrl();

  const applyJson = useCallback((text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text) as unknown;
      const result = validateCampaignPageSchema(parsed);
      if (!result.success) {
        setError(result.message);
        return false;
      }
      setSchema(result.data as unknown as CampaignPageSchema);
      setError(null);
      return true;
    } catch {
      setError('JSON 格式错误');
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => applyJson(jsonText), 400);
    return () => clearTimeout(timer);
  }, [jsonText, applyJson]);

  const syncCampaignInList = useCallback(
    (updated: CampaignSummary) => {
      setCampaign(updated);
      void campaignsQuery.refetch();
    },
    [campaignsQuery],
  );

  const loadOnlineCampaign = useCallback(
    async (slug: string) => {
      setLoadingSlug(slug);
      try {
        const data = await api.campaigns.getForManage(slug);
        setCampaign(data.campaign);
        if (data.editingVersion?.schema) {
          const text = JSON.stringify(data.editingVersion.schema, null, 2);
          setJsonText(text);
          applyJson(text);
        }
        success(`已加载「${data.campaign.title}」`);
      } catch (err) {
        toastError(getErrorMessage(err, '加载失败'));
      } finally {
        setLoadingSlug(null);
      }
    },
    [applyJson, success, toastError],
  );

  const loadCampaignTemplate = (slug: string) => {
    const buildTemplate = CAMPAIGN_TEMPLATE_BUILDERS[slug];
    if (!buildTemplate) return;
    const example = buildTemplate();
    const text = JSON.stringify(example, null, 2);
    setJsonText(text);
    applyJson(text);
    success('已加载示例模板（未保存到线上）');
  };

  const saveSchema = async () => {
    if (!campaign) {
      toastError('请先选择并加载活动');
      return;
    }
    if (!applyJson(jsonText)) return;

    setSaving(true);
    try {
      const payload = JSON.parse(jsonText) as Record<string, unknown>;
      const version = await api.campaigns.updateSchema(campaign.campaignId, payload);
      success(`Schema 已保存（v${version.versionNumber} 草稿）`);
    } catch (err) {
      toastError(getErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const requestPublish = () => {
    if (!campaign) {
      toastError('请先选择并加载活动');
      return;
    }
    if (!applyJson(jsonText)) return;
    setConfirmAction('publish');
  };

  const requestUnpublish = () => {
    if (!campaign) {
      toastError('请先选择并加载活动');
      return;
    }
    setConfirmAction('unpublish');
  };

  const publishCampaign = async () => {
    if (!campaign) return;
    if (!applyJson(jsonText)) return;

    setPublishing(true);
    try {
      const payload = JSON.parse(jsonText) as Record<string, unknown>;
      await api.campaigns.updateSchema(campaign.campaignId, payload);
      const result = await api.campaigns.publish(campaign.campaignId);
      syncCampaignInList(result.campaign);
      success('活动已发布，首页 Banner 将显示');
      setConfirmAction(null);
    } catch (err) {
      toastError(getErrorMessage(err, '发布失败'));
    } finally {
      setPublishing(false);
    }
  };

  const unpublishCampaign = async () => {
    if (!campaign) return;

    setUnpublishing(true);
    try {
      const result = await api.campaigns.unpublish(campaign.campaignId);
      syncCampaignInList(result.campaign);
      success('活动已下线，首页 Banner 将隐藏');
      setConfirmAction(null);
    } catch (err) {
      toastError(getErrorMessage(err, '下线失败'));
    } finally {
      setUnpublishing(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'publish') {
      void publishCampaign();
      return;
    }
    if (confirmAction === 'unpublish') {
      void unpublishCampaign();
    }
  };

  const openVersionsModal = async () => {
    if (!campaign) {
      toastError('请先选择并加载活动');
      return;
    }

    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const data = await api.campaigns.listVersions(campaign.campaignId);
      setVersions(data.versions);
    } catch (err) {
      toastError(getErrorMessage(err, '加载版本历史失败'));
      setVersionsOpen(false);
    } finally {
      setVersionsLoading(false);
    }
  };

  const loadVersionSchema = (version: CampaignVersion) => {
    const text = JSON.stringify(version.schema, null, 2);
    setJsonText(text);
    applyJson(text);
    setVersionsOpen(false);
    success(`已加载 v${version.versionNumber}（${version.status}）`);
  };

  const isPublished = campaign?.status === 'published';

  return (
    <div className={styles.layout}>
      <aside className={styles.editor}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <h1 className={styles.heading}>活动页搭建器</h1>
            {campaign ? (
              <span
                className={`${styles.statusBadge} ${
                  isPublished ? styles.statusBadgePublished : styles.statusBadgeDraft
                }`}
              >
                {isPublished ? '已发布' : '草稿'}
              </span>
            ) : null}
          </div>
        </div>

        <section className={styles.campaignList}>
          <p className={styles.campaignListLabel}>线上活动</p>
          {campaignsQuery.isLoading ? (
            <Loading size="sm" />
          ) : campaigns.length === 0 ? (
            <p className={styles.campaignListEmpty}>
              暂无活动。请先
              <a href={loginUrl} className={styles.loginLink}>
                登录
              </a>
              ，或运行 seed 创建活动。
            </p>
          ) : (
            campaigns.map((item) => {
              const isActive = campaign?.campaignId === item.campaignId;
              const hasTemplate = Boolean(CAMPAIGN_TEMPLATE_BUILDERS[item.slug]);
              const itemPublished = item.status === 'published';

              return (
                <div
                  key={item.campaignId}
                  className={`${styles.campaignItem} ${isActive ? styles.campaignItemActive : ''}`}
                >
                  <div className={styles.campaignItemInfo}>
                    <span className={styles.campaignItemTitle}>{item.title}</span>
                    <span className={styles.campaignItemSlug}>{item.slug}</span>
                    <span
                      className={`${styles.campaignItemStatus} ${
                        itemPublished ? styles.statusBadgePublished : styles.statusBadgeDraft
                      }`}
                    >
                      {itemPublished ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <div className={styles.campaignItemActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadOnlineCampaign(item.slug)}
                      loading={loadingSlug === item.slug}
                    >
                      加载线上
                    </Button>
                    {hasTemplate ? (
                      <Button size="sm" variant="secondary"
                        onClick={() => loadCampaignTemplate(item.slug)}>
                        示例模板
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <div className={styles.manageActions}>
          <Button size="sm" variant="secondary" onClick={() => void saveSchema()} loading={saving} disabled={!campaign}>
            保存 Schema
          </Button>
          <Button size="sm" variant="primary" onClick={requestPublish} loading={publishing} disabled={!campaign}>
            发布
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={requestUnpublish}
            loading={unpublishing}
            disabled={!campaign || !isPublished}
          >
            下线
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void openVersionsModal()} disabled={!campaign}>
            版本历史
          </Button>
        </div>

        <p className={styles.hint}>
          选择活动后点击「加载线上」或「版本历史」查看已保存的 Schema（存于数据库 campaign_versions）。
          保存/发布/下线需
          <a href={loginUrl} className={styles.loginLink}>
            登录
          </a>
          。发布前请将 preview-* 替换为真实 productId。
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

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'publish' ? '确认发布' : '确认下线'}
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => setConfirmAction(null)}>
              取消
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleConfirmAction}
              loading={confirmAction === 'publish' ? publishing : unpublishing}
            >
              {confirmAction === 'publish' ? '确认发布' : '确认下线'}
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          {confirmAction === 'publish'
            ? `确定发布「${campaign?.title ?? ''}」吗？发布后首页 Banner 与活动页将对用户可见。`
            : `确定下线「${campaign?.title ?? ''}」吗？下线后首页 Banner 将隐藏，活动页不可访问。`}
        </p>
      </Modal>

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="版本历史"
        width={480}
      >
        {versionsLoading ? (
          <Loading />
        ) : versions.length === 0 ? (
          <p className={styles.confirmText}>暂无已保存版本</p>
        ) : (
          <ul className={styles.versionList}>
            {versions.map((version) => (
              <li key={version.versionId}>
                <button
                  type="button"
                  className={styles.versionItem}
                  onClick={() => loadVersionSchema(version)}
                >
                  <span className={styles.versionItemTitle}>v{version.versionNumber}</span>
                  <span
                    className={`${styles.versionItemStatus} ${
                      version.status === 'published' ? styles.statusBadgePublished : styles.statusBadgeDraft
                    }`}
                  >
                    {version.status === 'published' ? '已发布' : '草稿'}
                  </span>
                  <span className={styles.versionItemTime}>
                    {new Date(version.createdAt).toLocaleString('zh-CN')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
