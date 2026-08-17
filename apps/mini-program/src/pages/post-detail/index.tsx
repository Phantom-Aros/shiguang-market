import { useEffect, useState } from 'react';
import { Button as TaroButton, ScrollView, Text, View, Image as TaroImage } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import type { PostDetail, PostShareMeta } from '@shiguang/shared';
import { Button, Empty, Icon, Image, Loading, Price } from '@shiguang/ui-taro';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import './index.scss';

export default function PostDetailPage() {
  const router = useRouter();
  const postId = router.params.postId ?? '';
  const { isLoggedIn } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [shareMeta, setShareMeta] = useState<PostShareMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!postId) return;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [detail, meta] = await Promise.all([
          api.posts.get(postId),
          api.posts.shareMeta(postId),
        ]);
        setPost(detail);
        setShareMeta(meta);
        Taro.setNavigationBarTitle({ title: detail.title.slice(0, 12) });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [postId]);

  useShareAppMessage(() => {
    if (shareMeta) {
      return {
        title: shareMeta.title,
        path: shareMeta.path,
        imageUrl: shareMeta.image,
      };
    }
    return {
      title: '拾光市集 · 发现好物',
      path: `/pages/post-detail/index?postId=${postId}`,
    };
  });

  const toggleLike = async () => {
    if (!post) return;
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }

    try {
      const result = post.isLiked
        ? await api.posts.unlike(post.postId)
        : await api.posts.like(post.postId);
      setPost({
        ...post,
        isLiked: result.isLiked ?? !post.isLiked,
        likeCount: result.likeCount ?? post.likeCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  };

  const toggleFavorite = async () => {
    if (!post) return;
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }

    try {
      const result = post.isFavorited
        ? await api.posts.unfavorite(post.postId)
        : await api.posts.favorite(post.postId);
      setPost({
        ...post,
        isFavorited: result.isFavorited ?? !post.isFavorited,
        favoriteCount: result.favoriteCount ?? post.favoriteCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  };

  if (loading) {
    return <Loading tip="加载中…" block />;
  }

  if (error || !post) {
    return (
      <Empty
        title="帖子不存在"
        description="内容可能已下架"
        action={
          <Button variant="primary" onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            返回首页
          </Button>
        }
      />
    );
  }

  const images = [
    { url: post.coverUrl, width: post.coverWidth, height: post.coverHeight },
    ...post.media.map((item) => ({
      url: item.url,
      width: item.width,
      height: item.height,
    })),
  ];

  return (
    <View className="detail-page">
      <ScrollView className="detail-scroll safe-bottom" scrollY>
        <View className="detail-author">
          <View className="detail-avatar">
            <Text>{post.author.nickname?.[0] ?? '用'}</Text>
          </View>
          <View>
            <Text className="detail-author-name">{post.author.nickname ?? '匿名用户'}</Text>
            <Text className="detail-meta">
              {post.viewCount} 浏览 · {post.likeCount} 赞 · {post.favoriteCount} 收藏
            </Text>
          </View>
        </View>

        <Text className="detail-title">{post.title}</Text>

        <View className="detail-gallery">
          {images.map((image, index) => (
            <Image
              key={`${image.url}-${index}`}
              src={image.url}
              alt={`${post.title} - 图 ${index + 1}`}
              aspectRatio={
                image.width && image.height ? `${image.width} / ${image.height}` : '4 / 5'
              }
            />
          ))}
        </View>

        {post.content && <Text className="detail-content">{post.content}</Text>}

        {post.tags.length > 0 && (
          <View className="detail-tags">
            {post.tags.map((tag) => (
              <Text key={tag} className="detail-tag">
                #{tag}
              </Text>
            ))}
          </View>
        )}

        {post.products.length > 0 && (
          <View className="detail-products">
            <Text className="detail-section-title">关联好物</Text>
            {post.products.map((product) => (
              <View key={product.productId} className="detail-product">
                {product.coverUrl ? (
                  <TaroImage
                    className="detail-product-cover"
                    src={product.coverUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <View className="detail-product-cover detail-product-cover--placeholder" />
                )}
                <View className="detail-product-info">
                  <Text className="detail-product-name">{product.name}</Text>
                  <Price
                    value={product.price}
                    originalValue={product.originalPrice ?? undefined}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="detail-footer safe-bottom">
        <View
          className={`detail-action ${post.isLiked ? 'detail-action--active' : ''}`}
          onClick={() => void toggleLike()}
        >
          <Icon
            name="heart"
            size={22}
            filled={post.isLiked}
            color={post.isLiked ? '#ff6b4a' : '#636e72'}
          />
          <Text className="detail-action__label">{post.isLiked ? '已赞' : '点赞'}</Text>
          <Text className="detail-action__count">{post.likeCount}</Text>
        </View>

        <View
          className={`detail-action ${post.isFavorited ? 'detail-action--active' : ''}`}
          onClick={() => void toggleFavorite()}
        >
          <Icon
            name="star"
            size={22}
            filled={post.isFavorited}
            color={post.isFavorited ? '#ff6b4a' : '#636e72'}
          />
          <Text className="detail-action__label">{post.isFavorited ? '已收藏' : '收藏'}</Text>
          <Text className="detail-action__count">{post.favoriteCount}</Text>
        </View>

        <TaroButton className="detail-action detail-action--share" openType="share">
          <Icon name="share" size={22} color="#636e72" />
          <Text className="detail-action__label">分享</Text>
        </TaroButton>
      </View>
    </View>
  );
}
