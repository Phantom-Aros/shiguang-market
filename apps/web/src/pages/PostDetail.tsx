import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import { AnalyticsEvents, track } from '@shiguang/shared/analytics';
import { Button, Empty, Icon, Image, Loading, Price, ProductCard } from '@shiguang/ui';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useScrollToTopOnForwardNav } from '../hooks/useScrollRestoration';
import { postQueryKey, relatedQueryKey } from '../lib/queryClient';
import styles from './PostDetail.module.css';

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const { toggleLike, toggleFavorite, isLikePending, isFavoritePending } =
    usePostInteractions(postId);

  useScrollToTopOnForwardNav(postId);

  useEffect(() => {
    if (!postId) return;
    track(AnalyticsEvents.DETAIL_VIEW, { type: 'post', postId });
  }, [postId]);

  const postQuery = useQuery({
    queryKey: postQueryKey(postId),
    queryFn: () => api.posts.get(postId),
    enabled: Boolean(postId),
  });

  const relatedQuery = useQuery({
    queryKey: relatedQueryKey(postId),
    queryFn: () => api.posts.related(postId),
    enabled: Boolean(postId) && Boolean(postQuery.data),
  });

  if (postQuery.isLoading) {
    return <Loading tip="加载中…" block />;
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <Empty
        title="帖子不存在"
        description="内容可能已下架"
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  const post = postQuery.data;
  const images = [
    { url: post.coverUrl, width: post.coverWidth, height: post.coverHeight },
    ...post.media.map((item) => ({
      url: item.url,
      width: item.width,
      height: item.height,
    })),
  ];

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon name="chevronRight" size={18} className={styles.backIcon} />
        返回
      </button>

      <article className={styles.article}>
        <header className={styles.authorBar}>
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <Icon name="user" size={18} />
            </div>
          )}
          <div>
            <p className={styles.authorName}>{post.author.nickname ?? '匿名用户'}</p>
            <p className={styles.meta}>
              {post.viewCount} 浏览 · {post.likeCount} 赞 · {post.favoriteCount} 收藏
            </p>
          </div>
        </header>

        <h1 className={styles.title}>{post.title}</h1>

        <div className={styles.gallery}>
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
        </div>

        {post.content && <p className={styles.content}>{post.content}</p>}

        {post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.products.length > 0 && (
          <section className={styles.products}>
            <h2>关联好物</h2>
            <div className={styles.productList}>
              {post.products.map((product) => (
                <Link
                  key={product.productId}
                  to={`/products/${product.productId}`}
                  className={styles.productItem}
                >
                  {product.coverUrl && (
                    <img src={product.coverUrl} alt="" className={styles.productCover} />
                  )}
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>{product.name}</p>
                    <Price value={product.price} originalValue={product.originalPrice ?? undefined} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <footer className={styles.actions}>
        <button
          type="button"
          className={post.isLiked ? styles.actionActive : styles.action}
          disabled={isLikePending}
          onClick={() => toggleLike(post.isLiked)}
        >
          <Icon name="heart" size={20} />
          <span>{post.isLiked ? '已赞' : '点赞'}</span>
        </button>
        <button
          type="button"
          className={post.isFavorited ? styles.actionActive : styles.action}
          disabled={isFavoritePending}
          onClick={() => toggleFavorite(post.isFavorited)}
        >
          <Icon name="star" size={20} />
          <span>{post.isFavorited ? '已收藏' : '收藏'}</span>
        </button>
      </footer>

      {relatedQuery.data && relatedQuery.data.items.length > 0 && (
        <section className={styles.related}>
          <h2>相关推荐</h2>
          <div className={styles.relatedGrid}>
            {relatedQuery.data.items.map((item) => (
              <Link key={item.postId} to={`/posts/${item.postId}`}>
                <ProductCard
                  imageUrl={item.coverUrl}
                  title={item.title}
                  price={item.minPrice ?? undefined}
                  authorName={item.author.nickname ?? '匿名用户'}
                  likeCount={item.likeCount}
                  liked={item.isLiked}
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
