import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  constructor(private readonly config: ConfigService) {
    const host = config.get<string>("SMTP_HOST");
    this.transporter = host ? nodemailer.createTransport({
      host,
      port: config.get<number>("SMTP_PORT", 587),
      secure: config.get("SMTP_SECURE", "false") === "true",
      auth: config.get<string>("SMTP_USER") ? {
        user: config.get<string>("SMTP_USER"),
        pass: config.get<string>("SMTP_PASSWORD"),
      } : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    }) : null;
  }

  async send(message: EmailMessage) {
    if (this.config.get("AUTOMATION_DRY_RUN", "true") === "true") {
      const id = `dry-email-${crypto.randomUUID()}`;
      this.logger.log({ id, to: message.to, subject: message.subject, dryRun: true });
      return { id, provider: "dry-run" };
    }
    if (!this.transporter) throw new ServiceUnavailableException("SMTP is not configured.");
    const result = await this.transporter.sendMail({
      from: this.config.get("EMAIL_FROM", "MediFlow AI <no-reply@mediflow.local>"),
      messageId: message.idempotencyKey ? `<${message.idempotencyKey}@mediflow.local>` : undefined,
      ...message,
    });
    return { id: result.messageId, provider: "smtp" };
  }
}
