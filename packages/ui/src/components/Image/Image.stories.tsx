import type { Meta, StoryObj } from '@storybook/react';
import { Image } from './Image';

const meta: Meta<typeof Image> = {
  title: '基础组件/Image',
  component: Image,
};

export default meta;
type Story = StoryObj<typeof Image>;

export const Default: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <Image src="https://picsum.photos/300/300" alt="示例图片" />
    </div>
  ),
};

export const ErrorFallback: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <Image src="https://invalid.example/image.jpg" alt="加载失败" />
    </div>
  ),
};
