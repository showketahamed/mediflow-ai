import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") message = body;
      else {
        const payload = body as { message?: string | string[]; error?: string };
        message = payload.message ?? payload.error ?? message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        message = "A record with these unique values already exists.";
      } else if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        message = "The requested record was not found.";
      }
    }

    const requestId = request.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
    if (status >= 500) {
      const error = exception instanceof Error ? exception : new Error("Unknown server error");
      this.logger.error(
        JSON.stringify({
          requestId,
          method: request.method,
          route: request.route?.path ?? request.path,
          errorType: error.constructor.name,
          message: error.message,
        }),
        error.stack,
      );
    }
    response.status(status).json({
      statusCode: status,
      message,
      path: request.path,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
