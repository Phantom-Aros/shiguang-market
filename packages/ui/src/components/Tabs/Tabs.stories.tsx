import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: '基础组件/Tabs',
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    items: [
      { key: 'recommend', label: '推荐', content: <p>推荐内容</p> },
      { key: 'follow', label: '关注', content: <p>关注内容</p> },
      { key: 'nearby', label: '附近', content: <p>附近内容</p>, disabled: true },
    ],
  },
};
