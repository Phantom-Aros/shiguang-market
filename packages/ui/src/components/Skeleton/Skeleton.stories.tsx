import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonCard } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: '基础组件/Skeleton',
  component: Skeleton,
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = {
  render: () => <Skeleton height={16} width="60%" />,
};

export const Circle: Story = {
  render: () => <Skeleton width={48} height={48} circle />,
};

export const Card: Story = {
  render: () => (
    <div style={{ width: 180 }}>
      <SkeletonCard />
    </div>
  ),
};
