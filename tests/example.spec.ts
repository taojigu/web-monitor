import { test, expect } from './fixtures';

// example showing how to access the JSON fixture data
// each test receives a `data` fixture containing whatever is in tests/data/sample.json

test('has title', async ({ page, data }) => {
  console.log('loaded fixture data', data);
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page, data }) => {
  // you can use `data` anywhere in your test. for example:
  expect(data.username).toBe('test-user');

  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
