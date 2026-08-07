import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button/Button';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: '基础组件/Modal',
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>打开弹窗</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="确认操作"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setOpen(false)}>确定</Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>确定要将此商品加入购物车吗？</p>
        </Modal>
      </>
    );
  },
};
