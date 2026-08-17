import { Text, View } from '@tarojs/components';
import './Price.scss';

function formatCents(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export interface PriceProps {
  value: number;
  originalValue?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Price({ value, originalValue, size = 'md', className = '' }: PriceProps) {
  const showOriginal = originalValue !== undefined && originalValue > value;

  return (
    <View className={`sg-price sg-price--${size} ${className}`}>
      <Text className="sg-price__currency">¥</Text>
      <Text className="sg-price__value">{formatCents(value)}</Text>
      {showOriginal && (
        <Text className="sg-price__original">¥{formatCents(originalValue)}</Text>
      )}
    </View>
  );
}
