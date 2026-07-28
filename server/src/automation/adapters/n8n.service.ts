import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  constructor(private readonly config: ConfigService) {}

  async trigger(workflow: string, payload: Record<string, unknown>) {
    if (this.config.get("AUTOMATION_DRY_RUN", "true") === "true") return { skipped: true, reason: "Automation dry-run mode is enabled." };
    const baseUrl = this.config.get<string>("N8N_BASE_URL");
    if (!baseUrl) return { skipped: true, reason: "N8N_BASE_URL is not configured." };
    const body = JSON.stringify(payload);
    const secret = this.config.getOrThrow<string>("N8N_WEBHOOK_SECRET");
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/webhook/${encodeURIComponent(workflow)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mediflow-signature": signature },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`n8n workflow ${workflow} returned ${response.status}.`);
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    this.logger.log({ workflow, status: response.status });
    return result;
  }

  verifyCallback(secret: string | undefined) {
    const expected = Buffer.from(this.config.getOrThrow<string>("N8N_WEBHOOK_SECRET"));
    const actual = Buffer.from(secret ?? "");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid n8n callback secret.");
    }
  }
}
