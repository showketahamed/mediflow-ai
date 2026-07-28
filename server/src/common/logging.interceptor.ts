import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { catchError, Observable, tap, throwError } from "rxjs";
import type { AuthUser } from "./types";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();
    const requestId = request.headers["x-request-id"]?.toString();
    const event = (status: number) => ({
        method: request.method,
        route: request.route?.path?.toString() ?? request.path,
        status,
        durationMs: Date.now() - started,
        userId: request.user?.sub,
        requestId,
        ipAddress: request.ip,
      });
    return next.handle().pipe(
      tap(() => this.logger.log(event(response.statusCode))),
      catchError((error: unknown) => {
        const status = typeof error === "object" && error && "getStatus" in error
          ? (error as { getStatus: () => number }).getStatus()
          : 500;
        this.logger.warn(event(status));
        return throwError(() => error);
      }),
    );
  }
}
