import { Injectable } from "@nestjs/common";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests = new Counter({
    name: "mediflow_http_requests_total",
    help: "Total HTTP requests.",
    labelNames: ["method", "route", "status"] as const,
    registers: [this.registry],
  });
  private readonly duration = new Histogram({
    name: "mediflow_http_request_duration_seconds",
    help: "HTTP request duration in seconds.",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });
  private readonly active = new Gauge({
    name: "mediflow_http_active_requests",
    help: "Current in-flight HTTP requests.",
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: "mediflow-api" });
    collectDefaultMetrics({ register: this.registry, prefix: "mediflow_process_" });
  }

  startRequest() {
    this.active.inc();
    const started = process.hrtime.bigint();
    return (method: string, route: string, status: number) => {
      this.active.dec();
      const seconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
      const labels = { method, route, status: String(status) };
      this.requests.inc(labels);
      this.duration.observe(labels, seconds);
    };
  }

  contentType() {
    return this.registry.contentType;
  }

  render() {
    return this.registry.metrics();
  }
}

