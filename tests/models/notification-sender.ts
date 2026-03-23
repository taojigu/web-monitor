import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotifyBuffer, SiteNotification, SiteItemEntry } from './notify-buffer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export class NotificationSender {
  private transporter: Transporter;
  private from: string;

  constructor(config: SmtpConfig) {
    this.from = config.user;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  /** Sends notification emails for all entries in the buffer to the given recipients. */
  async send(buffer: NotifyBuffer, recipients: string[]): Promise<void> {
    if (buffer.isEmpty()) {
      console.log('[NotificationSender] Buffer is empty — nothing to send.');
      return;
    }

    if (recipients.length === 0) {
      console.log('[NotificationSender] No recipients configured — skipping.');
      return;
    }

    const notifications = buffer.flush();
    const subject = `[Web Monitor] Job Notification — ${new Date().toDateString()}`;
    const html = this.buildHtml(notifications);
    const text = this.buildText(notifications);

    await this.transporter.sendMail({
      from: this.from,
      to: recipients.join(', '),
      subject,
      text,
      html,
    });

    console.log(`[NotificationSender] ✉ Sent to ${recipients.join(', ')} — ${notifications.length} site(s), ${this.countJobs(notifications)} job(s).`);
  }

  private countJobs(notifications: SiteNotification[]): number {
    return notifications.reduce((sum, n) => sum + n.jobs.length, 0);
  }

  private buildText(notifications: SiteNotification[]): string {
    return notifications
      .map(n => {
        const jobs = n.jobs.map((j: SiteItemEntry) => `  - ${j.title}\n    ${j.url}`).join('\n');
        return `${n.siteTitle}\n${jobs}`;
      })
      .join('\n\n');
  }

  private buildHtml(notifications: SiteNotification[]): string {
    const sections = notifications.map(n => {
      const rows = n.jobs
        .map((j: SiteItemEntry) => `<li><a href="${j.url}">${j.title}</a></li>`)
        .join('');
      return `<h2>${n.siteTitle}</h2><ul>${rows}</ul>`;
    });

    return `
      <html>
        <body style="font-family: sans-serif;">
          <h1>Job Notification — ${new Date().toDateString()}</h1>
          ${sections.join('<hr/>')}
        </body>
      </html>`;
  }
}

