import * as fs from 'fs';
import * as path from 'path';

/** Temp directory where each spec suite writes its own buffer file. */
export const NOTIFY_TEMP_DIR = path.resolve(__dirname, '../../.notify-temp');

export interface InfoItemEntry {
  title: string;
  url: string;
}

export interface SiteNotification {
  siteTitle: string;
  infoItems: InfoItemEntry[];
}

export interface BufferEntry {
  email: string;
  notifications: SiteNotification[];
}

/**
 * Accumulates site job notifications grouped by recipient email.
 *
 * Lifecycle per spec file:
 *   beforeAll → new NotifyBuffer()
 *   afterAll  → buffer.save(suiteName)   ← writes to NOTIFY_TEMP_DIR
 *   globalTeardown → NotifyBuffer.loadAll() ← merges all suite files, cleans up
 */
export class NotifyBuffer {
  private buffer: BufferEntry[] = [];

  /**
   * Adds a site's job list to the buffer, grouped by recipient email.
   * @param siteTitle  - The name/title of the site being monitored.
   * @param infoItems  - The list of job entries found for that site.
   * @param email      - The recipient email address.
   */
  add(siteTitle: string, infoItems: InfoItemEntry[], email: string): void {
    if (infoItems.length === 0) return;

    let entry = this.buffer.find(e => e.email === email);
    if (!entry) {
      entry = { email, notifications: [] };
      this.buffer.push(entry);
    }

    entry.notifications.push({ siteTitle, infoItems });
    console.log(`[NotifyBuffer] Added "${siteTitle}" (${infoItems.length} item(s)) → ${email}`);
  }

  /** Returns a snapshot of the current buffer without clearing it. */
  getAll(): BufferEntry[] {
    return [...this.buffer];
  }

  /** Drains and returns all buffered entries, then clears the buffer. */
  flush(): BufferEntry[] {
    const data = [...this.buffer];
    this.buffer = [];
    return data;
  }

  get size(): number {
    return this.buffer.length;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * Saves the buffer to a JSON file inside the temp dir.
   * The filename is derived from the suite name, e.g.
   *   "Te Papa Jobs - Host Search" → "te-papa-jobs-host-search.json"
   */
  save(suiteName: string, dir: string = NOTIFY_TEMP_DIR): void {
    if (this.isEmpty()) {
      console.log(`[NotifyBuffer] Nothing to save for "${suiteName}".`);
      return;
    }

    fs.mkdirSync(dir, { recursive: true });
    const filename = suiteName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '.json';
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(this.buffer, null, 2), 'utf-8');
    console.log(`[NotifyBuffer] Saved "${suiteName}" → ${filename} (${this.buffer.length} entry(ies))`);
  }

  /**
   * Reads every JSON file from the temp dir, merges all entries keyed by email,
   * deletes each file and then removes the temp dir.
   * Called once from globalTeardown after all suites have finished.
   */
  static loadAll(dir: string = NOTIFY_TEMP_DIR): NotifyBuffer {
    const instance = new NotifyBuffer();

    if (!fs.existsSync(dir)) {
      console.log('[NotifyBuffer] No temp dir found — nothing to merge.');
      return instance;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    console.log(`[NotifyBuffer] Merging ${files.length} suite file(s) from ${path.basename(dir)}/...`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const entries = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BufferEntry[];

        for (const entry of entries) {
          let existing = instance['buffer'].find(e => e.email === entry.email);
          if (!existing) {
            existing = { email: entry.email, notifications: [] };
            instance['buffer'].push(existing);
          }
          existing.notifications.push(...entry.notifications);
        }

        fs.unlinkSync(filePath);
        console.log(`[NotifyBuffer]   ✔ merged ${file}`);
      } catch (err) {
        console.warn(`[NotifyBuffer]   ✘ could not read ${file}:`, err);
      }
    }

    // Remove the temp dir once all files are merged
    try {
      fs.rmdirSync(dir);
      console.log('[NotifyBuffer] Temp dir removed.');
    } catch {
      // Non-empty dir (e.g. some files failed) — leave it for manual inspection
    }

    return instance;
  }
}
