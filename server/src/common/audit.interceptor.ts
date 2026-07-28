import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./types";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method) || request.path.includes("/auth/refresh")) {
      return next.handle();
    }
    return next.handle().pipe(tap({
      next: () => {
        void this.prisma.auditLog.create({
          data: {
            userId: request.user?.sub,
            action: request.method,
            entity: request.route?.path?.toString() ?? request.path,
            entityId: Array.isArray(request.params.id) ? request.params.id[0] : request.params.id,
            ipAddress: request.ip,
            metadata: {
              requestId: request.headers["x-request-id"]?.toString(),
              method: request.method,
            },
          },
        }).catch((error: unknown) => this.logger.error("Unable to persist audit log.", error));
      },
    }));
  }
}
