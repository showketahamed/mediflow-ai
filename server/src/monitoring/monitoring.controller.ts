import { Controller, ForbiddenException, Get, Header, Headers, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "./metrics.service";
import { timingSafeEqual } from "crypto";

@ApiTags("Monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get("live")
  live() {
    return { status: "ok", uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready", database: "connected", timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException("The API is not ready.");
    }
  }

  @Public()
  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiExcludeEndpoint()
  metricsEndpoint(@Headers("authorization") authorization?: string) {
    const expected = this.config.get<string>("METRICS_TOKEN");
    const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expectedBuffer = Buffer.from(expected ?? "");
    const providedBuffer = Buffer.from(provided);
    if (expected && (
      expectedBuffer.length !== providedBuffer.length
      || !timingSafeEqual(expectedBuffer, providedBuffer)
    )) {
      throw new ForbiddenException("Metrics credentials are invalid.");
    }
    return this.metrics.render();
  }
}
