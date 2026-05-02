import {expect, test} from '../fixtures';
import type { Page} from '@playwright/test';
import {SiteInfo, WebSiteConfig} from '../models/web-site.model';
import {NotifyBuffer} from '../models/notify-buffer';


/**
 * Collects job links from the results page, filters by keyword,
 * and adds matching jobs to the notify buffer for each recipient email.
 */
async function collectAndNotify(
    page: Page,
    siteInfo:SiteInfo,
    notifyBuffer: NotifyBuffer
): Promise<void> {
    const links = page.locator('.position a');
    const count = await links.count();

    if (count === 0) {
        console.log('No links found');
        return;
    }

    expect(count).toBeGreaterThan(0);

    const savedJobs: { title: string; url: string }[] = [];
    for (let index = 0; index < count; index++) {
        const link = links.nth(index);
        const title = (await link.textContent())?.trim() ?? '';
        const href = (await link.getAttribute('href')) ?? '';
        const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
        savedJobs.push({ title, url });
    }

    if (savedJobs.length == 0) {
        return;
    }

    for (const email of siteInfo.emails) {   // for...of to iterate values, not indices
        notifyBuffer.add(email, siteInfo.name, savedJobs);
    }
}

/**
 * Te papa Host-001: Search for a host at Wellington
 * Feature: Search
 */
test.describe('TepapaJob001', () => {
  let notifyBuffer: NotifyBuffer;

  test.beforeAll(() => {
    notifyBuffer = new NotifyBuffer();
    console.log('[Suite] NotifyBuffer initialised.');
  });

  test.afterAll(() => {
    notifyBuffer.save('TepapaJob001');
  });

  test('should search for host jobs in Wellington', async ({page, webSiteConfig}) => {
    const tepapaCode = 'TePapa';
    const site = webSiteConfig.findSiteByCode(tepapaCode);
    expect(site).toBeDefined();
    const siteInfo = site!.info;
    await page.goto(siteInfo.url, {waitUntil: 'networkidle'});
    for (const keyword of siteInfo.keywords) {
      // Step 1: Enter keyword in Job Title field
      await page.locator('#nav-jobsearch input[name="in_position"]').fill(keyword);
      // Step 2: Select 'Wellington' in Job Location dropdown
      await page.locator('select[name="in_location"]').selectOption({value: '"Wellington"'});
      // Step 3: Click Search button
      await page.locator('button:has-text("Search"), input[type="submit"][value*="Search"], button[name*="search"]').first().click();
      await page.waitForLoadState('networkidle');
      // Expected Result 1: navigates to the search results page
      await expect(page).toHaveURL(/jobs\.tepapa\.govt\.nz\/jobtools\/jncustomsearch\.searchResults/);
      // Expected Result 2 & 3: collect results and queue notifications
      await collectAndNotify(page, siteInfo, notifyBuffer);
    }
  });

});
