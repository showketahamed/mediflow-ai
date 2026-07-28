import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { json, urlencoded, type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { InputSanitizationPipe } from "./common/input-sanitization.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const origin = config.get<string>("CORS_ORIGIN", "http://localhost:5173").split(",").map((item) => item.trim());
  const trustProxy = config.get<number>("TRUST_PROXY", 0);

  app.setGlobalPrefix("api/v1");
  if (trustProxy) app.getHttpAdapter().getInstance().set("trust proxy", trustProxy);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestIdHeader = request.headers["x-request-id"];
    const supplied = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    const requestId = supplied && /^[A-Za-z0-9._-]{8,128}$/.test(supplied) ? supplied : randomUUID();
    request.headers["x-request-id"] = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  });
  const securityHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" },
  });
  const documentationHeaders = helmet({ contentSecurityPolicy: false });
  app.use((request: Request, response: Response, next: NextFunction) => (
    request.path.startsWith("/docs")
      ? documentationHeaders(request, response, next)
      : securityHeaders(request, response, next)
  ));
  app.use(cookieParser());
  app.use(json({ limit: "1mb", strict: true }));
  app.use(urlencoded({ extended: false, limit: "100kb", parameterLimit: 100 }));
  app.enableCors({ origin, credentials: true });
  app.useGlobalPipes(new InputSanitizationPipe(), new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: false,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("MediFlow AI API")
    .setDescription("Hospital operations REST API")
    .setVersion("1.0")
    .addBearerAuth()
    .addCookieAuth("mediflow_refresh")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.get<number>("PORT", 4000), "0.0.0.0");
}

void bootstrap();
