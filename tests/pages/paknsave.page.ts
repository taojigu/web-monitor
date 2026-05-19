import {expect, Locator, Page} from '@playwright/test';
import * as fs from 'fs';
import {InfoItemEntry, NotifyBuffer} from '../models/notify-buffer';

export interface PriceFilter {
    keyword: string;
    'min-price': number;
    'max-price': number;
}

export interface PaknSaveSite {
    title: string;
    url: string;
    emails: string[];
    location: string;
    'price-filter': PriceFilter[];
}

export interface PaknSaveConfig {
    'site-list': PaknSaveSite[];
}

export class PaknSavePOM {
    private readonly config: PaknSaveConfig;

    constructor(private readonly page: Page, dataFilePath: string) {
        this.config = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8')) as PaknSaveConfig;
    }

    public async collectAndNotify(): Promise<void> {
        for (const site of this.sites) {
            if (site.emails.length === 0 || site['price-filter'].length === 0) {
                console.log(`[PaknSave] Skipping site: ${site.title} | Location: ${site.location} because no emails or price filters`);
                continue;
            }
            console.log(`[PaknSave] Site: ${site.title} | Location: ${site.location}`);

            const notifyBuffer = new NotifyBuffer();
            try {
                await this.navigateToSite(site.url);
            } catch (err) {
                console.error(`[PaknSave] Cannot reach ${site.url}: ${(err as Error).message}`);
                continue;
            }

            await this.selectStore(site.location);

            const infoItemArray: InfoItemEntry[] = [];
            for (const filter of site['price-filter']) {
                const matched = await this.filterProduct(filter);
                infoItemArray.push(...matched);
                const ms = Math.floor(Math.random() * 4000) + 1000;
                await this.page.waitForTimeout(ms);
            }

            console.log(`[PaknSave] ${site.title}: ${infoItemArray.length} item(s) matched`);
            for (const email of site.emails) {
                notifyBuffer.add(email, site.title, infoItemArray);
            }
            notifyBuffer.save(site.title);
        }
    }

    private get sites(): PaknSaveSite[] {
        return this.config['site-list'];
    }

    private async navigateToSite(url: string): Promise<void> {
        await this.page.goto(url, {waitUntil: 'domcontentloaded'});
    }

    private async selectStore(location: string): Promise<void> {
        await this.page.getByTestId('store-dropdown').first().click();
        await this.page.getByPlaceholder('Search for name/address of store').fill(location);
        const firstStore = this.page.getByTestId('delivery-choose-location-store').first();
        await firstStore.getByTestId('delivery-choose-location-store-select-store').click();
        await this.page.getByTestId('delivery-middle-button').first().click();
        console.log(`[PaknSave] Store selected: ${location}`);
    }

    private async filterProduct(filter: PriceFilter): Promise<InfoItemEntry[]> {
        console.log(`[PaknSave] Searching keyword="${filter.keyword}" price=$${filter['min-price']}–$${filter['max-price']}`);
        const searchUrl = new URL('https://www.paknsave.co.nz/shop/search');
        searchUrl.searchParams.set('q', filter.keyword);
        searchUrl.searchParams.set('pg', '1');
        console.log(`[PaknSave] searchUrl: ${searchUrl}`);

        await this.page.goto(searchUrl.toString(), {timeout: 30000, waitUntil: 'load'});

        const product = this.page.locator('div[data-testid$="-EA-000"]').first();
        await expect(product).toBeVisible({timeout: 15000});

        const title = await product.locator('[data-testid="product-title"]').textContent();
        const price = await this.readPrice(product);
        const href = await product.locator('a[href]').first().getAttribute('href');
        const fullUrl = new URL(href!, this.page.url()).href;

        console.log(`[PaknSave] Top result: "${title?.trim()}" $${price} → ${fullUrl}`);

        const results: InfoItemEntry[] = [];
        if (!isNaN(price) && price >= filter['min-price'] && price <= filter['max-price']) {
            const itemTitle = `${title} - ${price} Dollars`;
            results.push({title: itemTitle, url: fullUrl});
            console.log(`[PaknSave] Matched: "${itemTitle}"`);
        } else {
            console.log(`[PaknSave] Skipped: price $${price} outside range $${filter['min-price']}–$${filter['max-price']}`);
        }

        return results;
    }



    private async readPrice(product: Locator): Promise<number> {
        const dollars = await product.locator('[data-testid="price-dollars"]').textContent();
        const cents = await product.locator('[data-testid="price-cents"]').textContent();
        return parseFloat(`${dollars?.trim() ?? '0'}.${cents?.trim() ?? '0'}`);
    }
}