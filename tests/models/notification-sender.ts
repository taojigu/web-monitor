import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotifyBuffer, BufferEntry, SiteNotification, InfoItemEntry } from './notify-buffer';

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

  constructor(config: SmtpConfig, transporter?: Transporter) {
    if (!config.user?.trim()) {
      throw new Error('[NotificationSender] config.user must not be empty.');
    }
    if (!config.password?.trim()) {
      throw new Error('[NotificationSender] config.password must not be empty.');
    }

    this.from = config.user;
    
    this.transporter = transporter ?? nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  /** Sends one email per recipient entry in the buffer. */
  async send(buffer: NotifyBuffer): Promise<void> {
    if (buffer.isEmpty()) {
      console.log('[NotificationSender] Buffer is empty — nothing to send.');
      return;
    }

    const entries = buffer.flush();

    for (const entry of entries) {
      const subject = `[Web Monitor] Notification — ${new Date().toDateString()}`;
      const html = this.buildHtml(entry);
      const text = this.buildText(entry);

      await this.transporter.sendMail({
        from: this.from,
        to: entry.email,
        subject,
        text,
        html,
      });

      const jobCount = entry.notifications.reduce((sum, n) => sum + n.infoItems.length, 0);
      console.log(`[NotificationSender] ✉ Sent to ${entry.email} — ${entry.notifications.length} site(s), ${jobCount} item(s).`);
    }
  }

  private buildText(entry: BufferEntry): string {
    return entry.notifications
      .map((n: SiteNotification) => {
        const items = n.infoItems.map((i: InfoItemEntry) => `  - ${i.title}\n    ${i.url}`).join('\n');
        return `${n.siteTitle}\n${items}`;
      })
      .join('\n\n');
  }

  private buildHtml(entry: BufferEntry): string {
    const sections = entry.notifications.map((n: SiteNotification) => {
      const rows = n.infoItems
        .map((i: InfoItemEntry) => `<li><a href="${i.url}">${i.title}</a></li>`)
        .join('');
      return `<h2>${n.siteTitle}</h2><ul>${rows}</ul>`;
    });

    return `
        <html lang="en">
        <body style="font-family: sans-serif;">
          <h1>Job Notification — ${new Date().toDateString()}</h1>
          ${sections.join('<hr/>')}
        </body>
      </html>`;
  }
}
