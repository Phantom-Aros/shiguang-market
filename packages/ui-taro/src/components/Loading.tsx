import { Text, View } from '@tarojs/components';
import './Loading.scss';

export interface LoadingProps {
  tip?: string;
  block?: boolean;
}

export function Loading({ tip = '加载中…', block = false }: LoadingProps) {
  return (
    <View className={`sg-loading ${block ? 'sg-loading--block' : ''}`}>
      <View className="sg-loading__spinner" />
      {tip && <Text className="sg-loading__tip">{tip}</Text>}
    </View>
  );
}
