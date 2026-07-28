import { Body, Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/public.decorator";
import { AuthService } from "./auth.service";
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyOtpDto } from "./auth.dto";
import { Throttle } from "@nestjs/throttler";
import { CsrfService } from "./csrf.service";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/types";

@ApiTags("Authentication")
@Controller("auth")
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly csrf: CsrfService,
  ) {}

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.headers["user-agent"] };
  }

  private cookieBase() {
    const sameSite = this.config.get<"strict" | "lax" | "none">("COOKIE_SAME_SITE", "strict");
    return {
      secure: this.config.get("COOKIE_SECURE", "false") === "true",
      sameSite,
      domain: this.config.get<string>("COOKIE_DOMAIN") || undefined,
    } as const;
  }

  private setSessionCookies(response: Response, token: string, remember = true) {
    const csrfToken = this.csrf.issue(token);
    response.cookie("mediflow_refresh", token, {
      ...this.cookieBase(),
      httpOnly: true,
      path: "/api/v1/auth",
      priority: "high",
      ...(remember ? { maxAge: this.config.get<number>("JWT_REFRESH_TTL_DAYS", 7) * 86_400_000 } : {}),
    });
    response.cookie("mediflow_csrf", csrfToken, {
      ...this.cookieBase(),
      httpOnly: true,
      path: "/api/v1/auth",
      priority: "high",
      ...(remember ? { maxAge: this.config.get<number>("JWT_REFRESH_TTL_DAYS", 7) * 86_400_000 } : {}),
    });
    return csrfToken;
  }

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto, this.metadata(request));
    const csrfToken = this.setSessionCookies(response, session.refreshToken, dto.remember);
    return { accessToken: session.accessToken, user: session.user, csrfToken };
  }

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post("verify-otp")
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.verifyOtp(dto, this.metadata(request));
    const csrfToken = this.setSessionCookies(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user, csrfToken };
  }

  @Public()
  @Get("csrf")
  csrfToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.mediflow_refresh as string | undefined;
    if (!refreshToken) return { csrfToken: null };
    const csrfToken = this.csrf.issue(refreshToken);
    response.cookie("mediflow_csrf", csrfToken, {
      ...this.cookieBase(),
      httpOnly: true,
      path: "/api/v1/auth",
      priority: "high",
    });
    return { csrfToken };
  }

  @Public()
  @Post("refresh")
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.mediflow_refresh as string | undefined;
    this.csrf.validateRequest(request, refreshToken);
    const session = await this.auth.refresh(refreshToken, this.metadata(request));
    const remember = request.headers["x-remember-session"] !== "false";
    const csrfToken = this.setSessionCookies(response, session.refreshToken, remember);
    return { accessToken: session.accessToken, user: session.user, csrfToken };
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiHeader({ name: "X-CSRF-Token", required: true })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.mediflow_refresh as string | undefined;
    this.csrf.validateRequest(request, refreshToken);
    const result = await this.auth.logout(refreshToken);
    response.clearCookie("mediflow_refresh", { ...this.cookieBase(), path: "/api/v1/auth" });
    response.clearCookie("mediflow_csrf", { ...this.cookieBase(), path: "/api/v1/auth" });
    return result;
  }

  @Get("sessions")
  @ApiBearerAuth()
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.sessions(user);
  }

  @Delete("sessions/:id")
  @ApiBearerAuth()
  revokeSession(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.auth.revokeSession(user, id);
  }
}
