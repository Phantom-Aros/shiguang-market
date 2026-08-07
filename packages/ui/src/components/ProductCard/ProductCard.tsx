import type { HTMLAttributes, MouseEvent } from 'react';
import { cn } from '../../utils/cn';
import { Icon } from '../Icon/Icon';
import { Image } from '../Image/Image';
import { Price } from '../Price/Price';
import styles from './ProductCard.module.css';

export interface ProductCardProps extends HTMLAttributes<HTMLElement> {
  imageUrl: string;
  title: string;
  aspectRatio?: string;
  price?: number;
  originalPrice?: number;
  authorName?: string;
  authorAvatar?: string;
  likeCount?: number;
  liked?: boolean;
  onLike?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function ProductCard({
  imageUrl,
  title,
  aspectRatio = '4 / 5',
  price,
  originalPrice,
  authorName,
  authorAvatar,
  likeCount,
  liked,
  onLike,
  className,
  ...rest
}: ProductCardProps) {
  return (
    <article className={cn(styles.card, className)} {...rest}>
      <div className={styles.imageWrap}>
        <Image src={imageUrl} alt={title} aspectRatio={aspectRatio} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.footer}>
          {price !== undefined && (
            <Price value={price} originalValue={originalPrice} size="sm" />
          )}
          {(authorName || likeCount !== undefined) && (
            <div className={styles.meta}>
              {authorName && (
                <div className={styles.author}>
                  {authorAvatar ? (
                    <img src={authorAvatar} alt="" className={styles.avatar} />
                  ) : (
                    <Icon name="user" size={14} />
                  )}
                  <span className={styles.authorName}>{authorName}</span>
                </div>
              )}
              {likeCount !== undefined && (
                <button
                  type="button"
                  className={cn(styles.like, liked && styles.liked)}
                  onClick={onLike}
                >
                  <Icon name="heart" size={14} />
                  <span>{likeCount}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
