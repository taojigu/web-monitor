import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { NotifyBuffer } from './models/notify-buffer';
import { NotificationSender } from './models/notification-sender';

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

  // Merge buffer files written by every worker process
  const buffer = NotifyBuffer.loadAll();

  if (!buffer.isEmpty()) {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    if (!smtpUser || !smtpPass) {
      console.warn('[Session] SMTP credentials (SMTP_USER / SMTP_PASS) are not configured — skipping notification.');
    } else {
      const sender = new NotificationSender({
        host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT   || '587'),
        secure: (process.env.SMTP_SECURE || 'false') === 'true',
        user:   smtpUser,
        password: smtpPass,
      });

      await sender.send(buffer);
    }
  } else {
    console.log('[Session] No notifications to send.');
  }
}
