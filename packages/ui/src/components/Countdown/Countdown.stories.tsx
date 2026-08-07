import type { Meta, StoryObj } from '@storybook/react';
import { Countdown } from './Countdown';

const meta: Meta<typeof Countdown> = {
  title: '业务组件/Countdown',
  component: Countdown,
  args: { endTime: Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 },
};

export default meta;
type Story = StoryObj<typeof Countdown>;

export const Default: Story = {};
