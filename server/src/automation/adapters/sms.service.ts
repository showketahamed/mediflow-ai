import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SmsMessage {
  to: string;
  body: string;
  idempotencyKey?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  constructor(private readonly config: ConfigService) {}

  async send(message: SmsMessage) {
    if (this.config.get("AUTOMATION_DRY_RUN", "true") === "true") {
      const id = `dry-sms-${crypto.randomUUID()}`;
      this.logger.log({ id, to: message.to, dryRun: true });
      return { id, provider: "dry-run" };
    }
    const url = this.config.get<string>("SMS_API_URL");
    const token = this.config.get<string>("SMS_API_TOKEN");
    if (!url || !token) throw new ServiceUnavailableException("SMS provider is not configured.");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": message.idempotencyKey ?? crypto.randomUUID() },
      body: JSON.stringify({ from: this.config.get("SMS_FROM", "MediFlow"), ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}.`);
    const result = await response.json() as { id?: string };
    return { id: result.id ?? crypto.randomUUID(), provider: "http" };
  }
}
