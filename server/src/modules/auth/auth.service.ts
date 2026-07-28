import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import bcrypt = require("bcryptjs");
import { createHash, randomInt, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../../common/types";
import type { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyOtpDto } from "./auth.dto";

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private audit(
    action: string,
    userId: string | undefined,
    metadata: RequestMetadata = {},
    attributes: Record<string, string> = {},
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: "Authentication",
        ipAddress: metadata.ipAddress,
        metadata: attributes,
      },
    }).catch(() => undefined);
  }

  private publicUser(user: { id: string; name: string; email: string; role: UserRole; title: string; hospitalId: string | null }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      hospitalId: user.hospitalId,
    };
  }

  private async issueSession(user: { id: string; email: string; role: UserRole; hospitalId: string | null; name: string; title: string }, metadata: RequestMetadata) {
    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role, hospitalId: user.hospitalId };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get("JWT_ACCESS_TTL", "15m"),
    });
    const refreshDays = this.config.get<number>("JWT_REFRESH_TTL_DAYS", 7);
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync({ ...payload, jti, type: "refresh" }, {
      secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
      expiresIn: `${refreshDays}d`,
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 86_400_000),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
    const staleSessions = await this.prisma.refreshToken.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      skip: 10,
      select: { id: true },
    });
    if (staleSessions.length) {
      await this.prisma.refreshToken.updateMany({
        where: { id: { in: staleSessions.map((session) => session.id) } },
        data: { revokedAt: new Date() },
      });
    }
    return { accessToken, refreshToken, user: this.publicUser(user) };
  }

  async login(dto: LoginDto, metadata: RequestMetadata) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.active || !user.emailVerified || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.audit("LOGIN_FAILED", user?.id, metadata);
      throw new UnauthorizedException("Invalid email or password.");
    }
    const session = await this.issueSession(user, metadata);
    await this.audit("LOGIN_SUCCEEDED", user.id, metadata);
    return session;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerified) throw new BadRequestException("An account already exists for this email.");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { name: dto.name, passwordHash } })
      : await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            name: dto.name,
            title: "Patient",
            role: UserRole.PATIENT,
            settings: { create: {} },
          },
        });
    const otp = this.config.get("NODE_ENV") === "production"
      ? randomInt(100000, 999999).toString()
      : this.config.get("DEMO_OTP", "246810");
    await this.prisma.verificationToken.deleteMany({ where: { userId: user.id, purpose: "VERIFY_EMAIL" } });
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        purpose: "VERIFY_EMAIL",
        tokenHash: this.hashToken(otp),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    return {
      message: "Verification code created.",
      ...(this.config.get("NODE_ENV") !== "production" ? { developmentOtp: otp } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, metadata: RequestMetadata) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new BadRequestException("Invalid or expired verification code.");
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        purpose: "VERIFY_EMAIL",
        tokenHash: this.hashToken(dto.otp),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!token) throw new BadRequestException("Invalid or expired verification code.");
    const verified = await this.prisma.$transaction(async (tx) => {
      await tx.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
      return tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    });
    const session = await this.issueSession(verified, metadata);
    await this.audit("EMAIL_VERIFIED", verified.id, metadata);
    return session;
  }

  async refresh(rawToken: string | undefined, metadata: RequestMetadata) {
    if (!rawToken) throw new UnauthorizedException("Refresh token is missing.");
    let payload: AuthUser & { jti: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token is invalid or expired.");
    }
    if (payload.type !== "refresh") throw new UnauthorizedException("Invalid token type.");
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hashToken(rawToken) } });
    if (!stored) {
      throw new UnauthorizedException("Refresh session is no longer active.");
    }
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit("REFRESH_TOKEN_REUSE_DETECTED", stored.userId, metadata);
      throw new UnauthorizedException("Refresh session is no longer active.");
    }
    if (stored.expiresAt <= new Date()) throw new UnauthorizedException("Refresh session is no longer active.");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new UnauthorizedException("Refresh session is no longer active.");
    const session = await this.issueSession(user, metadata);
    await this.audit("SESSION_REFRESHED", user.id, metadata);
    return session;
  }

  async logout(rawToken?: string) {
    let userId: string | undefined;
    if (rawToken) {
      userId = (await this.prisma.refreshToken.findUnique({
        where: { tokenHash: this.hashToken(rawToken) },
        select: { userId: true },
      }))?.userId;
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit("LOGOUT", userId);
    return { message: "Signed out." };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (user) {
      const token = randomInt(100000, 999999).toString();
      await this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          purpose: "RESET_PASSWORD",
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      });
    }
    return { message: "If the account exists, reset instructions have been sent." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new BadRequestException("Invalid or expired reset token.");
    const token = await this.prisma.verificationToken.findFirst({
      where: { userId: user.id, purpose: "RESET_PASSWORD", tokenHash: this.hashToken(dto.token), consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!token) throw new BadRequestException("Invalid or expired reset token.");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(dto.password, 12) } }),
      this.prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit("PASSWORD_RESET", user.id);
    return { message: "Password updated." };
  }

  async sessions(user: AuthUser) {
    return this.prisma.refreshToken.findMany({
      where: { userId: user.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(user: AuthUser, sessionId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId: user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new BadRequestException("Active session not found.");
    await this.audit("SESSION_REVOKED", user.sub, {}, { sessionId });
    return { message: "Session revoked." };
  }
}
