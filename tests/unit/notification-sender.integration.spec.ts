import { test, expect } from '@playwright/test';
import { NotificationSender } from '../models/notification-sender';
import { NotifyBuffer } from '../models/notify-buffer';

/**
 * Integration test — sends a real email via Gmail SMTP.
 *
 * Credentials are read from environment variables first,
 * then fall back to the values below.
 *
 * Gmail requirement: use an App Password, not your account password.
 * https://myaccount.google.com/apppasswords
 */
const SMTP_CONFIG = {
  host:     process.env.SMTP_HOST     ?? 'smtp.gmail.com',
  port:     parseInt(process.env.SMTP_PORT ?? '465'),
  secure:   (process.env.SMTP_SECURE  ?? 'true') === 'true',
  user:     process.env.SMTP_USER     ?? 'jitaogu1102@gmail.com',
  password: process.env.SMTP_PASS     ?? '',   // ← set via env var or .env file
};

const RECIPIENT = process.env.NOTIFY_TO ?? SMTP_CONFIG.user;

test.describe('NotificationSender (integration — sends real email)', () => {

  // Skip the whole suite if no password is configured
  test.beforeEach(async () => {
    if (!SMTP_CONFIG.password) {
      test.skip(true, 'SMTP_PASS env var is not set — skipping integration test');
    }
  });

  test('sends a real notification email to the configured recipient', async () => {
    const sender = new NotificationSender(SMTP_CONFIG); // no mock — uses real transporter

    const buffer = new NotifyBuffer();
    buffer.add(
      'Te Papa — Host Jobs Wellington',
      [
        { title: 'Senior Host',   url: 'https://jobs.tepapa.govt.nz/1' },
        { title: 'Gallery Guide', url: 'https://jobs.tepapa.govt.nz/2' },
      ],
      RECIPIENT,
    );

    // Will throw if SMTP connection or authentication fails
    await expect(sender.send(buffer)).resolves.not.toThrow();

    // Buffer must be empty after a successful send
    expect(buffer.isEmpty()).toBe(true);
  });

});

