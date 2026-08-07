import { z } from 'zod';

export const heroBannerBlockSchema: z.ZodTypeAny;
export const countdownBlockSchema: z.ZodTypeAny;
export const productGridBlockSchema: z.ZodTypeAny;
export const richTextBlockSchema: z.ZodTypeAny;
export const couponBannerBlockSchema: z.ZodTypeAny;
export const campaignBlockSchema: z.ZodTypeAny;
export const campaignPageSchema: z.ZodTypeAny;

export function validateCampaignPageSchema(
  schema: unknown,
): { success: true; data: Record<string, unknown> } | { success: false; message: string };

export function build618ExampleSchema(productIds: string[]): Record<string, unknown>;
