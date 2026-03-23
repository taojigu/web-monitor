import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_FILE = path.resolve(__dirname, '../.session-start');

export default async function globalSetup(config: FullConfig): Promise<void> {
  const startTime = new Date();
  fs.writeFileSync(SESSION_FILE, startTime.toISOString(), 'utf-8');
  console.log(`\n[Session] ▶ Test session started  at ${startTime.toISOString()}`);
}

