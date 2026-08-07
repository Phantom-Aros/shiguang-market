import type { Meta, StoryObj } from '@storybook/react';
import { Icon, type IconName } from './Icon';

const meta: Meta<typeof Icon> = {
  title: '基础组件/Icon',
  component: Icon,
  args: { name: 'heart', size: 24 },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {};

const allIcons: IconName[] = [
  'heart',
  'star',
  'cart',
  'search',
  'close',
  'chevronRight',
  'user',
  'image',
  'clock',
  'upload',
  'home',
];

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--sg-color-text)' }}>
      {allIcons.map((name) => (
        <div key={name} style={{ textAlign: 'center', width: 56 }}>
          <Icon name={name} size={24} />
          <div style={{ fontSize: 10, marginTop: 4 }}>{name}</div>
        </div>
      ))}
    </div>
  ),
};
