import type { Meta, StoryObj } from '@storybook/react';
import { Price } from './Price';

const meta: Meta<typeof Price> = {
  title: '业务组件/Price',
  component: Price,
  args: { value: 19900 },
};

export default meta;
type Story = StoryObj<typeof Price>;

export const Default: Story = {};
export const WithOriginal: Story = { args: { value: 19900, originalValue: 29900 } };
