import { Text, View } from '@tarojs/components';
import type { RichTextBlock as RichTextBlockType } from '@shiguang/campaign-schema';
import './RichTextBlock.scss';

export interface RichTextBlockProps {
  block: RichTextBlockType;
}

export function RichTextBlock({ block }: RichTextBlockProps) {
  return (
    <View className="campaign-richtext">
      {block.props.content.split('\n').map((line, index) => (
        <Text key={index} className="campaign-richtext__line">
          {line}
        </Text>
      ))}
    </View>
  );
}
