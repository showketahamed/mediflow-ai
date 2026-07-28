import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DiagnosticsModule } from "./modules/diagnostics/diagnostics.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { UsersModule } from "./modules/users/users.module";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { PermissionsGuard } from "./common/permissions.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditInterceptor } from "./common/audit.interceptor";
import { HealthController } from "./health.controller";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AutomationModule } from "./automation/automation.module";
import { AiModule } from "./modules/ai/ai.module";
import { validateEnvironment } from "./config/environment";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { MonitoringInterceptor } from "./monitoring/monitoring.interceptor";
import { AuditModule } from "./modules/audit/audit.module";
import { RedisThrottlerStorage } from "./common/redis-throttler.storage";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment, cache: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: config.get("RATE_LIMIT_STORAGE", "memory") === "redis"
          ? new RedisThrottlerStorage(config)
          : undefined,
        throttlers: [{
          ttl: config.get<number>("RATE_LIMIT_TTL_MS", 60_000),
          limit: config.get<number>("RATE_LIMIT_MAX", 120),
          blockDuration: config.get<number>("RATE_LIMIT_TTL_MS", 60_000),
        }],
        errorMessage: "Too many requests. Please retry after the rate-limit window.",
      }),
    }),
    MonitoringModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    DiagnosticsModule,
    NotificationsModule,
    SettingsModule,
    DashboardModule,
    AnalyticsModule,
    AutomationModule,
    AiModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MonitoringInterceptor },
  ],
  controllers: [HealthController],
})
export class AppModule {}
