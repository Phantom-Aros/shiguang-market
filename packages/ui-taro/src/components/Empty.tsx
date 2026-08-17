import type { ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import './Empty.scss';

export interface EmptyProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function Empty({
  title = '暂无内容',
  description,
  action,
}: EmptyProps) {
  return (
    <View className="sg-empty">
      <Text className="sg-empty__title">{title}</Text>
      {description && <Text className="sg-empty__desc">{description}</Text>}
      {action && <View className="sg-empty__action">{action}</View>}
    </View>
  );
}
