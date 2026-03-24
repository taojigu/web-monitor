import * as fs from 'fs';
import * as path from 'path';

export class SiteInfo {
  name: string;
  url: string;
  keywords: string[];
  emails: string[];

  constructor(data: { name: string; url: string; keywords: string[]; emails: string[] }) {
    this.name = data.name;
    this.url = data.url;
    this.keywords = data.keywords;
    this.emails = data.emails;
  }
}

export class Site {
  code: string;
  info: SiteInfo;

  constructor(data: { code: string; info: { name: string; url: string; keywords: string[]; emails: string[] } }) {
    this.code = data.code;
    this.info = new SiteInfo(data.info);
  }
}

export class WebSiteConfig {
  siteList: Site[];

  constructor(data: { 'site-list': Array<{ code: string; info: { name: string; url: string; keywords: string[]; emails: string[] } }> }) {
    this.siteList = data['site-list'].map(s => new Site(s));
  }

  /** Load and parse the web-site.json file */
  static fromFile(filePath?: string): WebSiteConfig {
    const resolved = filePath ?? path.resolve(__dirname, '..', 'data', 'web-site.json');
    const raw = fs.readFileSync(resolved, 'utf-8');
    return new WebSiteConfig(JSON.parse(raw));
  }

  /** Find a site entry by its code */
  findSiteByCode(code: string): Site | undefined {
    return this.siteList.find(s => s.code === code);
  }

  /*** check whether the title contains the key word*/
  titleContainsKeyword(title: string, code:string): boolean {
    const site = this.findSiteByCode(code);
    const siteInfo = site?.info;
    if (!siteInfo) {
      console.warn(`Site with code "${code}" not found.`);
      return false;
    }
    const keywords = siteInfo.keywords;
    return keywords.some((keyword)=>{
      return title.toLowerCase().includes(keyword.toLowerCase());
    });
  }
}

