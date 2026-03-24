import { test as base, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { WebSiteConfig } from './models/web-site.model';

// define the shape of whatever JSON you expect; use `any` if it varies
export type FixtureData = any;

type TestFixtures = {
  data: FixtureData;
  webSiteConfig: WebSiteConfig;
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
});

export type { Locator, Page };
export { test, expect };
