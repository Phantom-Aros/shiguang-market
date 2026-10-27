import { test, expect, type Page } from '@playwright/test';

const E2E_PHONE = '13900000001';
const E2E_CODE = '123456';

/** 通过 API 登录并注入 token，避免 UI 重试时触发短信发送限流 */
async function login(page: Page) {
  const sendRes = await page.request.post('/api/auth/sms/send', {
    data: { phone: E2E_PHONE },
  });
  if (!sendRes.ok() && sendRes.status() !== 429) {
    expect(sendRes.ok()).toBeTruthy();
  }

  let loginRes = await page.request.post('/api/auth/sms/login', {
    data: { phone: E2E_PHONE, code: E2E_CODE },
  });

  if (!loginRes.ok()) {
    expect(sendRes.ok() || sendRes.status() === 429).toBeTruthy();
    const retrySend = await page.request.post('/api/auth/sms/send', {
      data: { phone: E2E_PHONE },
    });
    expect(retrySend.ok()).toBeTruthy();
    loginRes = await page.request.post('/api/auth/sms/login', {
      data: { phone: E2E_PHONE, code: E2E_CODE },
    });
  }

  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  expect(body.ok).toBe(true);

  const { accessToken, refreshToken } = body.data.tokens;
  await page.goto('/login');
  await page.evaluate(
    (tokens) => {
      localStorage.setItem('sg_access_token', tokens.accessToken);
      localStorage.setItem('sg_refresh_token', tokens.refreshToken);
    },
    { accessToken, refreshToken },
  );
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

/** 从 Feed 中取一条有关联商品的帖子 */
async function findPostWithProduct(page: Page) {
  const feedRes = await page.request.get('/api/feed?limit=30');
  expect(feedRes.ok()).toBeTruthy();
  const feedData = await feedRes.json();
  const post = feedData.data.items.find(
    (item: { minPrice: number | null }) => item.minPrice != null,
  );
  expect(post).toBeTruthy();
  return post.postId as string;
}

test.describe('购物核心链路', () => {
  test('登录 → Feed → 详情 → 加购 → 下单 → 支付', async ({ page }) => {
    await login(page);

    await expect(page.getByTestId('feed-grid')).toBeVisible({ timeout: 15_000 });

    const postId = await findPostWithProduct(page);
    await page.goto(`/posts/${postId}`);

    await expect(page).toHaveURL(/\/posts\//);

    const productLink = page.getByTestId('post-product-link').first();
    await expect(productLink).toBeVisible({ timeout: 10_000 });
    await productLink.click();

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
