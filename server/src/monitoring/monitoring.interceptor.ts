import { CallHandler, ExecutionContext, HttpException, Injectable, type NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { catchError, Observable, tap, throwError } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const finish = this.metrics.startRequest();
    const route = request.route?.path
      ? `${request.baseUrl}${request.route.path}`
      : "unmatched";
    let recorded = false;
    const record = (status: number) => {
      if (recorded) return;
      recorded = true;
      finish(request.method, route, status);
    };
    return next.handle().pipe(
      tap(() => record(context.switchToHttp().getResponse().statusCode)),
      catchError((error: unknown) => {
        record(error instanceof HttpException ? error.getStatus() : 500);
        return throwError(() => error);
      }),
    );
  }
}

