import { test, expect } from '@playwright/test';

test.describe('活动页冒烟', () => {
  test('618 活动页正常渲染', async ({ page }) => {
    await page.goto('/618-sale');

    await expect(page.getByText('618 狂欢盛典')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('SG618')).toBeVisible();
  });
});
