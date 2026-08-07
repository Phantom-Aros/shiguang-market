import type { Meta, StoryObj } from '@storybook/react';
import { Loading } from './Loading';

const meta: Meta<typeof Loading> = {
  title: '基础组件/Loading',
  component: Loading,
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = { args: { tip: '加载中…' } };
export const Block: Story = { args: { block: true, tip: '请稍候' } };
