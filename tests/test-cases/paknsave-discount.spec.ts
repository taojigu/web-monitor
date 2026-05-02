import {expect, Locator, test} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {InfoItemEntry, NotifyBuffer} from '../models/notify-buffer';

interface PriceFilter {
    keyword: string;
    'min-price': number;
    'max-price': number;
}

interface PaknSaveSite {
    title: string;
    url: string;
    emails: string[];
    location: string;
    'price-filter': PriceFilter[];
}

interface PaknSaveConfig {
    'site-list': PaknSaveSite[];
}

async function readPrice(product: Locator): Promise<number> {
  const dollars = await product
      .locator('[data-testid="price-dollars"]')
      .textContent();

  const cents = await product
      .locator('[data-testid="price-cents"]')
      .textContent();
    return parseFloat(`${dollars?.trim() ?? '0'}.${cents?.trim() ?? '0'}`);
}

test.describe('PaknSaveDiscount', () => {
    let config: PaknSaveConfig;
    let notifyBuffer: NotifyBuffer;

    test.beforeAll(() => {
        const dataPath = path.resolve(__dirname, '../data/paknsave-discount.json');
        config = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as PaknSaveConfig;
    });

    test.afterAll(() => {

    });

    test('should collect discounted products from PaknSave', async ({page}) => {
        for (const site of config['site-list']) {
            console.log(`[PaknSave] Site: ${site.title} | Location: ${site.location}`);
            notifyBuffer = new NotifyBuffer();
            await page.goto(site.url, {waitUntil: 'networkidle'});
            // Select store
            await page.getByTestId('store-dropdown').first().click();
            await page.getByPlaceholder('Search for name/address of store').fill(site.location);
            const firstStore = page.getByTestId('delivery-choose-location-store').first();
            await firstStore.getByTestId('delivery-choose-location-store-select-store').click();
            await page.getByTestId('delivery-middle-button').first().click();
            console.log(`[PaknSave] Store selected: ${site.location}`);
            //await page.goto(site.url, { waitUntil: 'networkidle' });
            const infoItemArray: InfoItemEntry[] = [];
            for (const filter of site['price-filter']) {
                console.log(`[PaknSave] Searching keyword="${filter.keyword}" price=$${filter['min-price']}–$${filter['max-price']}`);
                const searchInput = page.locator('[data-testid="search-bar-input"][id="search-bar-desktop"]');
                await expect(searchInput).toBeVisible({ timeout: 30000 });
                await searchInput.fill(filter.keyword);
                await searchInput.press('Enter');
                await page.waitForLoadState('networkidle');

                const product = page.locator('div[data-testid*="-EA-000"]').first();

                await expect(product).toBeVisible();

                const title = await product
                    .locator('[data-testid="product-title"]')
                    .textContent();

                const price = await readPrice(product);

                const href = await product
                    .locator('a[href]')
                    .first()
                    .getAttribute('href');

                const fullUrl = new URL(href!, page.url()).href;
                console.log(`[PaknSave] Top result: "${title?.trim()}" $${price} → ${fullUrl}`);

                if (!isNaN(price) && price >= filter['min-price'] && price <= filter['max-price']) {
                    const itemTitle = `${title} - ${price} Dollars`;
                    const entry: InfoItemEntry = {title:itemTitle, url: fullUrl};
                    infoItemArray.push(entry);
                    console.log(`[PaknSave] Matched: "${itemTitle}"`);
                } else {
                    console.log(`[PaknSave] Skipped: price $${price} outside range $${filter['min-price']}–$${filter['max-price']}`);
                }

                await page.goBack();
                await page.waitForLoadState('networkidle');
                await page.context().clearCookies();
                await page.waitForTimeout(1000);

            }
            console.log(`[PaknSave] ${site.title}: ${infoItemArray.length} item(s) matched`);
            for (const email of site.emails) {
                notifyBuffer.add(email, site.title, infoItemArray);
            }
            notifyBuffer.save(site.title);

        }
    });
});
