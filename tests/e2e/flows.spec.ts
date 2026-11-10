import { test, expect } from '@playwright/test';
test('landing, interactive warehouse, search and product details', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('GOOD');
  await page.getByRole('button', { name: 'Explore Organization', exact: true }).hover();
  await expect(page.locator('.warehouse-tooltip')).toContainText('ORGANIZATION');
  await page.screenshot({ path: 'docs/screenshots/landing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Explore Audio', exact: true }).click();
  await expect(page).toHaveURL('/stock');
  await expect(page.getByRole('button', { name: 'Audio 3', exact: true })).toHaveClass('active');
  await page.getByRole('textbox', { name: 'Search products' }).fill('headphones');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'View Studio headphones' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add to bundle', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open bundle' }).click();
  await expect(page.getByRole('dialog')).toContainText('Studio headphones');
  expect(errors).toEqual([]);
});
test('mission creates three bundles; quantity edit and server quote survive reload', async ({
  page,
}) => {
  await page.goto('/run');
  await page.getByRole('button', { name: 'Forge bundles', exact: true }).click();
  await expect(page.locator('.offer-card')).toHaveCount(3);
  await page.screenshot({ path: 'docs/screenshots/offer-forge-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Accessible table view' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Choose', exact: true }).first().click();
  const first = page.locator('.cart-line').first();
  const initial = await first.locator('strong').innerText();
  await first.getByRole('button', { name: 'Increase ' + initial }).click();
  await expect(first.locator('.quantity-controls>span')).toHaveText('2');
  await page.getByRole('button', { name: 'Reserve & review quote' }).click();
  await expect(page).toHaveURL(/\/checkout\/[a-f0-9-]+/);
  await expect(page.getByRole('heading', { name: 'A clear deal.' })).toBeVisible();
  const total = await page.locator('.grand-total strong').innerText();
  await page.reload();
  await expect(page.locator('.grand-total strong')).toHaveText(total);
  await expect(page.getByRole('button', { name: 'Continue to PayPal' })).toBeDisabled();
  await expect(
    page.getByText('Merchant sandbox credentials are not configured.', { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/checkout-unconfigured.png', fullPage: true });
  await page.getByRole('button', { name: 'Release quote & return' }).click();
  await expect(page).toHaveURL('/run');
});
test('provider popup keeps key only in memory and clears on refresh', async ({ page }) => {
  await page.goto('/run');
  await page.getByRole('button', { name: 'Connect your AI', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('We do not store or save API keys.');
  await page.getByLabel('API key', { exact: true }).fill('test-only-not-real-provider-key');
  await page.getByRole('button', { name: 'Use this provider' }).click();
  await expect(page.getByRole('button', { name: 'openai connected' })).toBeVisible();
  const stored = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(stored)).not.toContain('test-only-not-real-provider-key');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Connect your AI', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connect your AI', exact: true }).click();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  await page.screenshot({ path: 'docs/screenshots/provider-settings.png', fullPage: true });
});
test('merchant signs in, creates product, imports CSV, approves campaign and reads actual ledger', async ({
  page,
}) => {
  await page.goto('/merchant');
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await page.getByLabel('Email', { exact: true }).fill('merchant@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Test-only-password-2026');
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.merchant-sidebar')).toBeVisible();
  await expect(page.getByText('CONFIRMED NET REVENUE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: 'docs/screenshots/merchant-command.png', fullPage: true });
  await page.getByRole('button', { name: 'Inventory vault', exact: true }).click();
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('SKU', { exact: true }).fill('E2E-01');
  await page.getByLabel('Product name', { exact: true }).fill('E2E task light');
  await page.getByRole('button', { name: 'Save product record' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Search merchant inventory' }).fill('E2E task');
  await expect(page.locator('.ag-center-cols-container')).toContainText('E2E task light');
  await page.screenshot({ path: 'docs/screenshots/inventory-vault.png', fullPage: true });
  await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  await page
    .getByLabel('CSV preview / editable')
    .fill(
      'sku,name,category,cost,retail,floor,stock\nE2E-IMPORT,Imported desk tray,Organization,1000,3000,1800,12',
    );
  await page.getByRole('button', { name: 'Validate & import' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Campaign forge', exact: true }).click();
  await page.getByLabel('Campaign name').fill('E2E lighting campaign');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve campaign' }).click();
  await expect(page.getByRole('heading', { name: 'E2E lighting campaign' })).toBeVisible();
  await page.getByRole('button', { name: 'Payment ledger', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No provider orders yet.' })).toBeVisible();
});
test('mobile layout, navigation, mission and provider form are usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('GOOD');
  await page.screenshot({ path: 'docs/screenshots/landing-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Start a rescue run', exact: true }).click();
  await page.getByRole('button', { name: 'Forge bundles', exact: true }).click();
  await expect(page.locator('.offer-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/offer-forge-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Connect your AI', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
