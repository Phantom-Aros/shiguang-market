import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import type { CampaignPageSchema } from '@shiguang/campaign-schema';
import type { ProductDetail } from '@shiguang/shared';
import { FEATURED_CAMPAIGN_SLUG } from '@shiguang/shared';
import { CampaignRenderer } from '@shiguang/campaign-taro';
import { Empty, Loading } from '@shiguang/ui-taro';
import { api } from '../../lib/api';
import './index.scss';

export default function CampaignPage() {
  const router = useRouter();
  const slug = router.params.slug || FEATURED_CAMPAIGN_SLUG;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [schema, setSchema] = useState<CampaignPageSchema | null>(null);
  const [title, setTitle] = useState('618 狂欢');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    void api.campaigns
      .getBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title);
        setSchema(data.schema as CampaignPageSchema);
        Taro.setNavigationBarTitle({ title: data.title });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useShareAppMessage(() => ({
    title,
    path: `/pages/campaign/index?slug=${slug}`,
  }));

  const fetchProducts = useCallback(async (productIds: string[]) => {
    const results = await Promise.allSettled(productIds.map((id) => api.products.get(id)));
    return results
      .filter((result): result is PromiseFulfilledResult<ProductDetail> => result.status === 'fulfilled')
      .map((result) => result.value);
  }, []);

  const handleProductClick = useCallback((productId: string) => {
    Taro.navigateTo({ url: `/pages/product-detail/index?productId=${productId}` });
  }, []);

  if (loading) {
    return <Loading tip="加载活动…" block />;
  }

  if (error || !schema) {
    return (
      <Empty
        title="活动不存在"
        description="该活动可能已下线或未发布"
        action={
          <View className="campaign-retry" onClick={() => Taro.navigateBack()}>
            返回
          </View>
        }
      />
    );
  }

  return (
    <ScrollView className="campaign-scroll" scrollY enableBackToTop>
      <CampaignRenderer
        schema={schema}
        fetchProducts={fetchProducts}
        onProductClick={handleProductClick}
      />
    </ScrollView>
  );
}
