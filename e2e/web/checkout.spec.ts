import { test, expect } from '@playwright/test';

const E2E_PHONE = '13900000001';
const E2E_CODE = '123456';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-phone').fill(E2E_PHONE);
  await page.getByTestId('login-code').fill(E2E_CODE);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('购物核心链路', () => {
  test('登录 → Feed → 详情 → 加购 → 下单 → 支付', async ({ page }) => {
    await login(page);

    await page.goto('/');
    await expect(page.getByTestId('feed-grid')).toBeVisible({ timeout: 15_000 });

    const firstCard = page.getByTestId('feed-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL(/\/posts\//);

    const productLink = page.getByRole('link').filter({ hasText: /¥|￥|\d/ }).first();
    if (await productLink.isVisible()) {
      await productLink.click();
    } else {
      const postId = page.url().split('/posts/')[1];
      const feedRes = await page.request.get(`/api/feed?limit=1`);
      const feedData = await feedRes.json();
      const detailRes = await page.request.get(`/api/posts/${postId || feedData.data.items[0].postId}`);
      const detail = await detailRes.json();
      const productId = detail.data.products[0].productId;
      await page.goto(`/products/${productId}`);
    }

    await expect(page).toHaveURL(/\/products\//);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByText('已加入购物车')).toBeVisible();

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: '商品清单' })).toBeVisible();
    await page.getByTestId('submit-order').click();

    await expect(page).toHaveURL(/\/orders\/.+\/pay/);
    await page.getByTestId('mock-pay').click();
    await expect(page.getByText('支付成功')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  });
});
