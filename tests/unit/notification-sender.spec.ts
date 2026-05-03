import { test, expect } from '@playwright/test';
import type { Transporter } from 'nodemailer';
import { NotificationSender } from '../models/notification-sender';
import { NotifyBuffer } from '../models/notify-buffer';

// ── helpers ──────────────────────────────────────────────────────────────────

const SMTP_CONFIG = {
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  user: 'jitaogu1102@gmail.com',
  password: 'GoogleWord80!',
};

interface SentMail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Creates a fake nodemailer Transporter that records every sendMail call. */
function createMockTransporter(): { transporter: Transporter; sent: SentMail[] } {
  const sent: SentMail[] = [];
  const transporter = {
    sendMail: async (options: SentMail) => {
      sent.push({ ...options });
      return { messageId: 'mock-id' };
    },
  } as unknown as Transporter;
  return { transporter, sent };
}

/** Builds a NotifyBuffer pre-filled with test data. */
function buildBuffer(entries: { email: string; siteTitle: string; items: { title: string; url: string }[] }[]): NotifyBuffer {
  const buffer = new NotifyBuffer();
  for (const e of entries) {
    buffer.add(e.email, e.siteTitle, e.items);
  }
  return buffer;
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('NotificationSender', () => {

  test.describe('constructor assertions', () => {

    test('throws when config.user is empty', () => {
      expect(() => new NotificationSender({ ...SMTP_CONFIG, user: '' }))
        .toThrow('config.user must not be empty');
    });

    test('throws when config.user is whitespace only', () => {
      expect(() => new NotificationSender({ ...SMTP_CONFIG, user: '   ' }))
        .toThrow('config.user must not be empty');
    });

    test('throws when config.password is empty', () => {
      expect(() => new NotificationSender({ ...SMTP_CONFIG, password: '' }))
        .toThrow('config.password must not be empty');
    });

    test('throws when config.password is whitespace only', () => {
      expect(() => new NotificationSender({ ...SMTP_CONFIG, password: '   ' }))
        .toThrow('config.password must not be empty');
    });

  });

  test('does nothing when the buffer is empty', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);
    const buffer = new NotifyBuffer();

    await sender.send(buffer);

    expect(sent).toHaveLength(0);
  });

  test('sends one email per unique recipient', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      { email: 'jitaogu1102@gmail.com', siteTitle: 'Te Papa', items: [{ title: 'Host', url: 'https://jobs.tepapa.govt.nz/1' }] },
      //{ email: 'bob@example.com',   siteTitle: 'Te Papa', items: [{ title: 'Guide', url: 'https://jobs.tepapa.govt.nz/2' }] },
    ]);

    await sender.send(buffer);

    expect(sent).toHaveLength(1);
    expect(sent.map(s => s.to)).toEqual(
      expect.arrayContaining(['jitaogu1102@gmail.com'])
    );
  });

  test('sets the from address to the SMTP user', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      { email: 'alice@example.com', siteTitle: 'Te Papa', items: [{ title: 'Host', url: 'https://jobs.tepapa.govt.nz/1' }] },
    ]);

    await sender.send(buffer);

    expect(sent[0].from).toBe(SMTP_CONFIG.user);
  });

  test('subject contains [Web Monitor]', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      { email: 'alice@example.com', siteTitle: 'Te Papa', items: [{ title: 'Host', url: 'https://jobs.tepapa.govt.nz/1' }] },
    ]);

    await sender.send(buffer);

    expect(sent[0].subject).toContain('[Web Monitor]');
  });

  test('html body contains job title and url', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      {
        email: 'alice@example.com',
        siteTitle: 'Te Papa',
        items: [{ title: 'Senior Host', url: 'https://jobs.tepapa.govt.nz/42' }],
      },
    ]);

    await sender.send(buffer);

    expect(sent[0].html).toContain('Senior Host');
    expect(sent[0].html).toContain('https://jobs.tepapa.govt.nz/42');
  });

  test('plain text body contains job title and url', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      {
        email: 'alice@example.com',
        siteTitle: 'Te Papa',
        items: [{ title: 'Senior Host', url: 'https://jobs.tepapa.govt.nz/42' }],
      },
    ]);

    await sender.send(buffer);

    expect(sent[0].text).toContain('Senior Host');
    expect(sent[0].text).toContain('https://jobs.tepapa.govt.nz/42');
  });

  test('groups multiple site notifications for the same recipient into one email', async () => {
    const { transporter, sent } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    // same email, two different site titles
    const buffer = buildBuffer([
      { email: 'alice@example.com', siteTitle: 'Te Papa',    items: [{ title: 'Host',  url: 'https://a.com/1' }] },
      { email: 'alice@example.com', siteTitle: 'Museum Jobs', items: [{ title: 'Guide', url: 'https://a.com/2' }] },
    ]);

    await sender.send(buffer);

    // only ONE email should be sent since both items share the same recipient
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('alice@example.com');
    expect(sent[0].html).toContain('Te Papa');
    expect(sent[0].html).toContain('Museum Jobs');
  });

  test('flushes the buffer after sending', async () => {
    const { transporter } = createMockTransporter();
    const sender = new NotificationSender(SMTP_CONFIG, transporter);

    const buffer = buildBuffer([
      { email: 'alice@example.com', siteTitle: 'Te Papa', items: [{ title: 'Host', url: 'https://a.com/1' }] },
    ]);

    await sender.send(buffer);

    expect(buffer.isEmpty()).toBe(true);
  });

});

