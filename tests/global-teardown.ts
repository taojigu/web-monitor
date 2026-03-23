import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_FILE = path.resolve(__dirname, '../.session-start');

export default async function globalTeardown(config: FullConfig): Promise<void> {
  const endTime = new Date();
  let duration = 'unknown';

  if (fs.existsSync(SESSION_FILE)) {
    const startTime = new Date(fs.readFileSync(SESSION_FILE, 'utf-8').trim());
    duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    fs.unlinkSync(SESSION_FILE);
  }

  console.log(`\n[Session] ■ Test session finished at ${endTime.toISOString()} (duration: ${duration}s)`);
}

