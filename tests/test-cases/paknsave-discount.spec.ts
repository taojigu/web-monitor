import {expect, Locator, Page, test} from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import {InfoItemEntry, NotifyBuffer} from '../models/notify-buffer';
import {environmentFileName} from "../../util/enviroment_util";


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

async function filterProduct(filter: PriceFilter, page: Page, infoItemArray: InfoItemEntry[]) {
    console.log(`[PaknSave] Searching keyword="${filter.keyword}" price=$${filter['min-price']}–$${filter['max-price']}`);
    console.log(`[PaknSave] filterProduct page url: ${page.url()}`);
    const searchUrl = new URL("https://www.paknsave.co.nz/shop/search");

    searchUrl.searchParams.set("q", filter.keyword);
    searchUrl.searchParams.set("pg", "1");
    console.log(`[PaknSave] searchUrl: ${searchUrl}`);
    await page.goto(searchUrl.toString(), {timeout: 30000, waitUntil: "load"});

    const product = page.locator('div[data-testid$="-EA-000"]').first();

    await expect(product).toBeVisible({timeout: 15000});

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
        const entry: InfoItemEntry = {title: itemTitle, url: fullUrl};
        infoItemArray.push(entry);
        console.log(`[PaknSave] Matched: "${itemTitle}"`);
    } else {
        console.log(`[PaknSave] Skipped: price $${price} outside range $${filter['min-price']}–$${filter['max-price']}`);
    }

    await page.goBack();
    await page.waitForLoadState('load');
}

test.describe('PaknSaveDiscount', () => {
    let config: PaknSaveConfig;
    let notifyBuffer: NotifyBuffer;

    test.beforeAll(() => {
        const fileName = environmentFileName("paknsave-discount","json");
        const dataPath = path.resolve(__dirname, `../data/${fileName}`);
        console.log(`[PaknSave] Load data file ${dataPath}`);
        config = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as PaknSaveConfig;
    });

    test.beforeEach(async ({page})=>{
        await page.goto('https://www.paknsave.co.nz',{waitUntil: 'load'});
    });


    test('should collect discounted products from PaknSave', async ({page}) => {

        for (const site of config['site-list']) {
            if (site.emails.length === 0 || site['price-filter'].length === 0) {
                console.log(`[PaknSave] Skipping site: ${site.title} | Location: ${site.location} because no emails or price filters`);
                continue;
            }
            console.log(`[PaknSave] Site: ${site.title} | Location: ${site.location}`);
            notifyBuffer = new NotifyBuffer();
            try {
                await page.goto(site.url, {waitUntil: 'domcontentloaded'});
            } catch (err) {
                console.error(`[PaknSave] Cannot reach ${site.url}: ${(err as Error).message}`);
                continue;
            }
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
                await filterProduct(filter, page, infoItemArray);
                const ms = Math.floor(Math.random() * 4000) + 1000;
                await page.waitForTimeout(ms);
            }
            console.log(`[PaknSave] ${site.title}: ${infoItemArray.length} item(s) matched`);
            for (const email of site.emails) {
                notifyBuffer.add(email, site.title, infoItemArray);
            }
            notifyBuffer.save(site.title);
        }
    });
});
