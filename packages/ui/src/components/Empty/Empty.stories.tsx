import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button/Button';
import { Empty } from './Empty';

const meta: Meta<typeof Empty> = {
  title: '基础组件/Empty',
  component: Empty,
};

export default meta;
type Story = StoryObj<typeof Empty>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    title: '购物车是空的',
    description: '去逛逛，发现更多好物',
    action: <Button size="sm">去首页</Button>,
  },
};
