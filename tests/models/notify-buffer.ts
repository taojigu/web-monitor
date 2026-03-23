export interface JobEntry {
  title: string;
  url: string;
}

export interface SiteNotification {
  siteTitle: string;
  jobs: JobEntry[];
}

/**
 * Accumulates site job notifications in an internal buffer.
 * Call `add()` to append entries and `flush()` to drain and process them.
 */
export class NotifyBuffer {
  private buffer: SiteNotification[] = [];

  /**
   * Adds a site's job list to the buffer.
   * @param siteTitle - The name/title of the site being monitored.
   * @param jobs      - The list of job entries found for that site.
   */
  add(siteTitle: string, jobs: JobEntry[]): void {
    if (jobs.length === 0) return;
    this.buffer.push({ siteTitle, jobs });
    console.log(`[NotifyBuffer] Added "${siteTitle}" with ${jobs.length} job(s).`);
  }

  /** Returns a snapshot of the current buffer without clearing it. */
  getAll(): SiteNotification[] {
    return [...this.buffer];
  }

  /** Drains and returns all buffered notifications, then clears the buffer. */
  flush(): SiteNotification[] {
    const data = [...this.buffer];
    this.buffer = [];
    return data;
  }

  /** Total number of site entries currently buffered. */
  get size(): number {
    return this.buffer.length;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}

