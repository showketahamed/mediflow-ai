import { Global, Module } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { MetricsService } from "./metrics.service";
import { MonitoringInterceptor } from "./monitoring.interceptor";

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [MetricsService, MonitoringInterceptor],
  exports: [MetricsService, MonitoringInterceptor],
})
export class MonitoringModule {}

