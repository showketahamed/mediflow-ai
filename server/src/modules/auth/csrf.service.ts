import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Request } from "express";

@Injectable()
export class CsrfService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>("CSRF_SECRET")
      ?? config.getOrThrow<string>("JWT_REFRESH_SECRET");
  }

  issue(refreshToken: string) {
    const nonce = randomBytes(32).toString("base64url");
    return `${nonce}.${this.signature(nonce, refreshToken)}`;
  }

  validateRequest(request: Request, refreshToken?: string) {
    if (request.headers["sec-fetch-site"] === "cross-site") {
      throw new ForbiddenException("Cross-site session requests are not allowed.");
    }
    const header = request.headers["x-csrf-token"];
    const headerToken = Array.isArray(header) ? header[0] : header;
    const cookieToken = request.cookies?.mediflow_csrf as string | undefined;
    if (!headerToken || !cookieToken || !refreshToken || !this.equal(headerToken, cookieToken)) {
      throw new ForbiddenException("CSRF validation failed.");
    }
    const [nonce, signature, extra] = headerToken.split(".");
    if (!nonce || !signature || extra || !this.equal(signature, this.signature(nonce, refreshToken))) {
      throw new ForbiddenException("CSRF validation failed.");
    }
  }

  private signature(nonce: string, refreshToken: string) {
    return createHmac("sha256", this.secret)
      .update(nonce)
      .update(".")
      .update(refreshToken)
      .digest("base64url");
  }

  private equal(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
