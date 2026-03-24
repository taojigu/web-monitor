import { test, expect } from '@playwright/test';
import { NotificationSender } from '../models/notification-sender';
import { NotifyBuffer } from '../models/notify-buffer';

/**
 * Integration test — sends a real email via Gmail SMTP.
 *
 * ⚠️  Gmail requires an APP PASSWORD, not your account password.
 *     Steps to generate one:
 *       1. Enable 2-Step Verification: https://myaccount.google.com/security
 *       2. Create App Password:        https://myaccount.google.com/apppasswords
 *          (Select app: "Mail", device: "Other" → give it a name → copy the 16-char code)
 *       3. Set environment variable:   SMTP_PASS=xxxx xxxx xxxx xxxx
 *
 *     Run: SMTP_PASS="xxxx xxxx xxxx xxxx" npx playwright test notification-sender.integration
 */
const SMTP_CONFIG = {
  host:     process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port:     parseInt(process.env.SMTP_PORT ?? '587'),   // 587=STARTTLS, 465=SSL
  secure:   (process.env.SMTP_SECURE ?? 'false') === 'true',  // false for 587, true for 465
  user:     process.env.SMTP_USER ?? 'jitaogu1102@gmail.com',
  password: process.env.SMTP_PASS ?? '',
};

const RECIPIENT = process.env.NOTIFY_TO ?? SMTP_CONFIG.user;
const RECIPIENT2 = process.env.NOTIFY_TO1 ?? 'QuitMobilePhoneAddiction@gmail.com'

/** Returns true when the error is a Gmail App Password auth rejection. */
function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Application-specific password required') ||
         msg.includes('InvalidSecondFactor') ||
         msg.includes('Invalid login') ||
         msg.includes('535') ||
         msg.includes('534');
}

test.describe('NotificationSender (integration — sends real email)', () => {

  test.beforeEach(() => {
    if (!SMTP_CONFIG.password) {
      test.skip(true,
        'SMTP_PASS is not set.\n' +
        'Generate a Gmail App Password at https://myaccount.google.com/apppasswords\n' +
        'then run: SMTP_PASS="xxxx xxxx xxxx xxxx" npx playwright test notification-sender.integration'
      );
    }
  });

  test('sends a real notification email to the configured recipient', async () => {
    const sender = new NotificationSender(SMTP_CONFIG);
    const buffer = new NotifyBuffer();
    buffer.add(
      'Te Papa — Host Jobs Wellington',
      [
        { title: 'Senior Host',   url: 'https://jobs.tepapa.govt.nz/1' },
        { title: 'Gallery Guide', url: 'https://jobs.tepapa.govt.nz/2' },
      ],
      RECIPIENT,
    );
    buffer.add(
        'PB Tech',
        [
          { title: 'Senior Host',   url: 'https://jobs.tepapa.govt.nz/1' },
          { title: 'Gallery Guide', url: 'https://jobs.tepapa.govt.nz/2' },
        ],
        RECIPIENT,
    );
    buffer.add(
        'PB Tech',
        [
          { title: 'Senior Host',   url: 'https://jobs.tepapa.govt.nz/1' },
          { title: 'Gallery Guide', url: 'https://jobs.tepapa.govt.nz/2' },
        ],
        RECIPIENT2,
    );


    try {
      await sender.send(buffer);
    } catch (err) {
      if (isAuthError(err)) {
        test.skip(true,
          '❌ Gmail rejected the password — an App Password is required.\n' +
          '   Steps:\n' +
          '     1. Go to https://myaccount.google.com/apppasswords\n' +
          '     2. Create a new App Password (Mail / Other)\n' +
          '     3. Copy the 16-character code (spaces are OK)\n' +
          '     4. Re-run with: SMTP_PASS="xxxx xxxx xxxx xxxx" npx playwright test notification-sender.integration\n\n' +
          `   Original error: ${(err as Error).message}`
        );
      }
      throw err; // re-throw any non-auth error so it fails normally
    }

    expect(buffer.isEmpty()).toBe(true);
    console.log(`\n✉  Email sent to ${RECIPIENT} — check your inbox.`);
  });

});
