import {test as base, expect, BrowserContext, chromium} from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { WebSiteConfig } from './models/web-site.model';

// define the shape of whatever JSON you expect; use `any` if it varies
export type FixtureData = any;

type TestFixtures = {
  data: FixtureData;
  webSiteConfig: WebSiteConfig;
  page: Page;
  content: BrowserContext;
};

const test = base.extend<TestFixtures>({

  data: async ({}, use) => {
    const filePath = path.resolve(__dirname, 'data', 'sample.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    await use(JSON.parse(raw));
  },

  webSiteConfig: async ({}, use) => {
    await use(WebSiteConfig.fromFile());
  },
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(
        './playwright-user-data',
        {
          headless: !!process.env.CI,
          channel: 'chrome',

          userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

          viewport: {
            width: 1280,
            height: 720,
          },
        }
    );

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    await use(context);

    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();

    page.setDefaultTimeout(60000);

    await use(page);
  },
});

export type { Locator, Page };
export { test, expect };
