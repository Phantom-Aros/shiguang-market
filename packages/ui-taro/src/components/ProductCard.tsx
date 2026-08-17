import { Text, View } from '@tarojs/components';
import { Icon } from './Icon';
import { Image } from './Image';
import { Price } from './Price';
import './ProductCard.scss';

export interface ProductCardProps {
  imageUrl: string;
  title: string;
  aspectRatio?: string;
  price?: number;
  originalPrice?: number;
  authorName?: string;
  likeCount?: number;
  liked?: boolean;
  onClick?: () => void;
  onLike?: () => void;
}

export function ProductCard({
  imageUrl,
  title,
  aspectRatio = '4 / 5',
  price,
  originalPrice,
  authorName,
  likeCount,
  liked,
  onClick,
  onLike,
}: ProductCardProps) {
  return (
    <View className="sg-product-card" onClick={onClick}>
      <Image src={imageUrl} alt={title} aspectRatio={aspectRatio} />
      <View className="sg-product-card__body">
        <Text className="sg-product-card__title">{title}</Text>
        <View className="sg-product-card__footer">
          {price !== undefined && (
            <Price value={price} originalValue={originalPrice} size="sm" />
          )}
          {(authorName || likeCount !== undefined) && (
            <View className="sg-product-card__meta">
              {authorName && (
                <Text className="sg-product-card__author">{authorName}</Text>
              )}
              {likeCount !== undefined && (
                <View
                  className={`sg-product-card__like ${liked ? 'sg-product-card__like--active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.();
                  }}
                >
                  <Icon
                    name="heart"
                    size={14}
                    filled={liked}
                    color={liked ? '#ff6b4a' : '#b2bec3'}
                  />
                  <Text className="sg-product-card__like-count">{likeCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
