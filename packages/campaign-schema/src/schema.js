import { z } from 'zod';

const blockBase = z.object({
  id: z.string().min(1, 'block id 不能为空'),
});

export const heroBannerBlockSchema = blockBase.extend({
  type: z.literal('heroBanner'),
  props: z.object({
    imageUrl: z.string().url('heroBanner.imageUrl 必须是有效 URL'),
    title: z.string().min(1, 'heroBanner.title 不能为空'),
    subtitle: z.string().optional(),
    linkUrl: z.string().url().optional(),
    height: z.number().int().positive().optional(),
  }),
});

export const countdownBlockSchema = blockBase.extend({
  type: z.literal('countdown'),
  props: z.object({
    endTime: z.number().int().positive('countdown.endTime 必须是有效时间戳'),
    label: z.string().optional(),
  }),
});

export const productGridBlockSchema = blockBase.extend({
  type: z.literal('productGrid'),
  props: z.object({
    title: z.string().optional(),
    productIds: z.array(z.string().min(1)).min(1, 'productGrid 至少需要一个商品'),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
  }),
});

export const richTextBlockSchema = blockBase.extend({
  type: z.literal('richText'),
  props: z.object({
    content: z.string().min(1, 'richText.content 不能为空'),
  }),
});

export const couponBannerBlockSchema = blockBase.extend({
  type: z.literal('couponBanner'),
  props: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    code: z.string().optional(),
    backgroundColor: z.string().optional(),
  }),
});

export const campaignBlockSchema = z.discriminatedUnion('type', [
  heroBannerBlockSchema,
  countdownBlockSchema,
  productGridBlockSchema,
  richTextBlockSchema,
  couponBannerBlockSchema,
]);

export const campaignPageSchema = z.object({
  title: z.string().min(1, '活动标题不能为空'),
  theme: z
    .object({
      primaryColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
  blocks: z.array(campaignBlockSchema).min(1, '至少需要一个楼层'),
});

/**
 * @param {unknown} schema
 */
export function validateCampaignPageSchema(schema) {
  const result = campaignPageSchema.safeParse(schema);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    return { success: false, message };
  }
  return { success: true, data: result.data };
}

/**
 * @param {string[]} productIds
 */
export function build618ExampleSchema(productIds) {
  const endTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return {
    title: '拾光市集 618 狂欢',
    theme: {
      primaryColor: '#ff4d4f',
      backgroundColor: '#fff5f5',
    },
    blocks: [
      {
        id: 'hero-1',
        type: 'heroBanner',
        props: {
          imageUrl: 'https://picsum.photos/seed/sg-618-hero/750/400',
          title: '618 狂欢盛典',
          subtitle: '全场好物低至 5 折，限时抢购',
          height: 200,
        },
      },
      {
        id: 'countdown-1',
        type: 'countdown',
        props: {
          endTime,
          label: '距活动结束',
        },
      },
      {
        id: 'coupon-1',
        type: 'couponBanner',
        props: {
          title: '满 99 减 20',
          description: '领取专属优惠券，下单立减',
          code: 'SG618',
          backgroundColor: '#ff4d4f',
        },
      },
      {
        id: 'products-1',
        type: 'productGrid',
        props: {
          title: '爆款好物',
          productIds: productIds.slice(0, 4),
          columns: 2,
        },
      },
      {
        id: 'richtext-1',
        type: 'richText',
        props: {
          content:
            '拾光市集 618 活动规则：\n1. 活动期间部分商品参与满减\n2. 优惠券每人限领一张\n3. 活动最终解释权归拾光市集所有',
        },
      },
    ],
  };
}
