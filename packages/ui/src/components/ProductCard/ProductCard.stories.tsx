import type { Meta, StoryObj } from '@storybook/react';
import { ProductCard } from './ProductCard';

const meta: Meta<typeof ProductCard> = {
  title: '业务组件/ProductCard',
  component: ProductCard,
  args: {
    imageUrl: 'https://picsum.photos/300/375',
    title: '夏日清新碎花连衣裙 轻薄透气百搭款',
    price: 19900,
    originalPrice: 29900,
    authorName: '小拾光',
    likeCount: 1286,
  },
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: 180 }}>
      <ProductCard {...args} />
    </div>
  ),
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 180px)', gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <ProductCard
          key={i}
          imageUrl={`https://picsum.photos/seed/${i}/300/375`}
          title={`种草好物 #${i} 精选推荐`}
          price={9900 + i * 1000}
          originalPrice={15900}
          authorName="达人"
          likeCount={100 * i}
        />
      ))}
    </div>
  ),
};
