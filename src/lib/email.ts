export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  fromName?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  priority?: "high" | "normal" | "low";
}

interface AlertEmailData {
  alertName: string;
  severity: "info" | "warning" | "critical";
  deviceName: string;
  message: string;
  timestamp: string;
  dashboardUrl: string;
}

interface ReportEmailData {
  reportName: string;
  period: string;
  summary: string;
  downloadUrl: string;
  generatedAt: string;
}

interface InviteEmailData {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
  role: string;
  expiresAt: string;
}

interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresAt: string;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#dc2626";
    case "warning":
      return "#f59e0b";
    case "info":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}

function baseEmailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0; padding: 32px; text-align: center; }
    .header h1 { color: white; font-size: 24px; margin: 0; font-weight: 600; }
    .content { background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn-primary { background-color: #6366f1; color: white; }
    .btn-danger { background-color: #dc2626; color: white; }
    .alert-box { padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid; }
    .info-text { color: #6b7280; font-size: 14px; line-height: 1.6; }
    .divider { border-top: 1px solid #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>AI IoT Dashboard &mdash; Automated Notification</p>
      <p>To manage notification preferences, visit your dashboard settings.</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderAlertEmail(data: AlertEmailData): EmailMessage["html"] {
  const color = severityColor(data.severity);
  const content = `
    <div class="alert-box" style="border-color: ${color}; background-color: ${color}10;">
      <strong style="color: ${color}; text-transform: uppercase; font-size: 12px;">${escapeHtml(data.severity)}</strong>
      <p style="margin: 8px 0 0 0; color: #1f2937; font-weight: 600;">${escapeHtml(data.alertName)}</p>
    </div>
    <p class="info-text"><strong>Device:</strong> ${escapeHtml(data.deviceName)}</p>
    <p class="info-text"><strong>Time:</strong> ${escapeHtml(data.timestamp)}</p>
    <p class="info-text">${escapeHtml(data.message)}</p>
    <div class="divider"></div>
    <p style="text-align: center;">
      <a href="${escapeHtml(data.dashboardUrl)}" class="btn btn-primary">View Dashboard</a>
    </p>`;

  return baseEmailTemplate(`Alert: ${data.alertName}`, content);
}

export function renderReportEmail(data: ReportEmailData): EmailMessage["html"] {
  const content = `
    <p class="info-text">Your report has been generated and is ready for download.</p>
    <div class="alert-box" style="border-color: #3b82f6; background-color: #3b82f610;">
      <strong style="color: #3b82f6;">Report Details</strong>
      <p style="margin: 8px 0 0 0; color: #1f2937;"><strong>Name:</strong> ${escapeHtml(data.reportName)}</p>
      <p style="margin: 4px 0 0 0; color: #1f2937;"><strong>Period:</strong> ${escapeHtml(data.period)}</p>
      <p style="margin: 4px 0 0 0; color: #1f2937;"><strong>Generated:</strong> ${escapeHtml(data.generatedAt)}</p>
    </div>
    <p class="info-text">${escapeHtml(data.summary)}</p>
    <div class="divider"></div>
    <p style="text-align: center;">
      <a href="${escapeHtml(data.downloadUrl)}" class="btn btn-primary">Download Report</a>
    </p>`;

  return baseEmailTemplate(`Report: ${data.reportName}`, content);
}

export function renderInviteEmail(data: InviteEmailData): EmailMessage["html"] {
  const content = `
    <p class="info-text"><strong>${escapeHtml(data.inviterName)}</strong> has invited you to join <strong>${escapeHtml(data.organizationName)}</strong> on AI IoT Dashboard.</p>
    <div class="alert-box" style="border-color: #10b981; background-color: #10b98110;">
      <strong style="color: #10b981;">Invitation Details</strong>
      <p style="margin: 8px 0 0 0; color: #1f2937;"><strong>Role:</strong> ${escapeHtml(data.role)}</p>
      <p style="margin: 4px 0 0 0; color: #1f2937;"><strong>Expires:</strong> ${escapeHtml(data.expiresAt)}</p>
    </div>
    <div class="divider"></div>
    <p style="text-align: center;">
      <a href="${escapeHtml(data.inviteUrl)}" class="btn btn-primary">Accept Invitation</a>
    </p>`;

  return baseEmailTemplate("You're Invited!", content);
}

export function renderPasswordResetEmail(data: PasswordResetEmailData): EmailMessage["html"] {
  const content = `
    <p class="info-text">Hi ${escapeHtml(data.userName)},</p>
    <p class="info-text">We received a request to reset your password. Click the button below to set a new password.</p>
    <div class="divider"></div>
    <p style="text-align: center;">
      <a href="${escapeHtml(data.resetUrl)}" class="btn btn-danger">Reset Password</a>
    </p>
    <div class="divider"></div>
    <p class="info-text"><strong>This link expires at:</strong> ${escapeHtml(data.expiresAt)}</p>
    <p class="info-text">If you did not request a password reset, you can safely ignore this email.</p>`;

  return baseEmailTemplate("Password Reset Request", content);
}

export class EmailService {
  private config: EmailConfig;
  private sentEmails: EmailMessage[] = [];

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private buildFrom(): string {
    return this.config.fromName
      ? `"${this.config.fromName}" <${this.config.from}>`
      : this.config.from;
  }

  async send(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
    const fullMessage: EmailMessage = {
      ...message,
      from: this.buildFrom(),
    };

    this.sentEmails.push(fullMessage);

    return {
      success: true,
      messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  async sendAlert(data: AlertEmailData): Promise<{ success: boolean; messageId: string }> {
    return this.send({
      to: data.dashboardUrl.includes("admin") ? "admin@example.com" : "team@example.com",
      subject: `[${data.severity.toUpperCase()}] ${data.alertName} - ${data.deviceName}`,
      html: renderAlertEmail(data) ?? "",
      priority: data.severity === "critical" ? "high" : "normal",
    });
  }

  async sendReport(data: ReportEmailData): Promise<{ success: boolean; messageId: string }> {
    return this.send({
      to: "team@example.com",
      subject: `Report Ready: ${data.reportName}`,
      html: renderReportEmail(data) ?? "",
    });
  }

  async sendInvite(data: InviteEmailData): Promise<{ success: boolean; messageId: string }> {
    return this.send({
      to: "newuser@example.com",
      subject: `You're invited to ${data.organizationName}`,
      html: renderInviteEmail(data) ?? "",
    });
  }

  async sendBulk(
    messages: EmailMessage[]
  ): Promise<Array<{ success: boolean; messageId: string }>> {
    const results: Array<{ success: boolean; messageId: string }> = [];
    for (const message of messages) {
      results.push(await this.send(message));
    }
    return results;
  }

  getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

export function createEmailService(config?: Partial<EmailConfig>): EmailService {
  return new EmailService({
    host: config?.host ?? process.env.SMTP_HOST ?? "localhost",
    port: config?.port ?? parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: config?.secure ?? false,
    auth: config?.auth ?? {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    from: config?.from ?? process.env.EMAIL_FROM ?? "noreply@iot-dashboard.com",
    fromName: config?.fromName ?? "AI IoT Dashboard",
  });
}

export const emailService = createEmailService();
