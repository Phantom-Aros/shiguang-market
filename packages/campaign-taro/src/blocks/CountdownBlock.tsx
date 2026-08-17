import { Text, View } from '@tarojs/components';
import type { CountdownBlock as CountdownBlockType } from '@shiguang/campaign-schema';
import { Countdown } from '../components/Countdown';
import './CountdownBlock.scss';

export interface CountdownBlockProps {
  block: CountdownBlockType;
}

export function CountdownBlock({ block }: CountdownBlockProps) {
  const { endTime, label } = block.props;

  return (
    <View className="campaign-countdown-block">
      {label ? <Text className="campaign-countdown-block__label">{label}</Text> : null}
      <Countdown endTime={endTime} />
    </View>
  );
}
