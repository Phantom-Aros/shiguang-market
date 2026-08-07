import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button/Button';
import { ToastProvider, useToast } from './Toast';

function ToastDemo() {
  const toast = useToast();

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" onClick={() => toast.success('操作成功')}>
        Success
      </Button>
      <Button size="sm" variant="secondary" onClick={() => toast.error('操作失败')}>
        Error
      </Button>
      <Button size="sm" variant="ghost" onClick={() => toast.warning('请注意')}>
        Warning
      </Button>
      <Button size="sm" variant="ghost" onClick={() => toast.info('提示信息')}>
        Info
      </Button>
    </div>
  );
}

const meta: Meta = {
  title: '基础组件/Toast',
  decorators: [(Story) => (
    <ToastProvider>
      <Story />
    </ToastProvider>
  )],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <ToastDemo />,
};
