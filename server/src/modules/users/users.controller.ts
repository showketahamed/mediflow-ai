import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import bcrypt = require("bcryptjs");
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./users.dto";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
@RequirePermissions("users:manage")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  private targetHospital(user: AuthUser, requested?: string) {
    if (user.role === UserRole.SUPER_ADMIN) return requested ?? null;
    if (!user.hospitalId || (requested && requested !== user.hospitalId)) {
      throw new ForbiddenException("Hospital administrators may only manage their own staff.");
    }
    return user.hospitalId;
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.user.findMany({
      where: user.role === UserRole.SUPER_ADMIN ? {} : { hospitalId: user.hospitalId },
      select: { id: true, name: true, email: true, role: true, title: true, active: true, hospitalId: true, departmentId: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return rows;
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    if (user.role !== UserRole.SUPER_ADMIN && (dto.role === UserRole.SUPER_ADMIN || dto.role === UserRole.HOSPITAL_ADMIN)) {
      throw new ForbiddenException("Only super administrators can create administrative accounts.");
    }
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        title: dto.title,
        role: dto.role,
        hospitalId: this.targetHospital(user, dto.hospitalId),
        departmentId: dto.departmentId,
        active: true,
        emailVerified: true,
        settings: { create: {} },
      },
      select: { id: true, name: true, email: true, role: true, title: true, active: true, hospitalId: true, departmentId: true },
    });
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    this.targetHospital(user, target.hospitalId ?? undefined);
    if (user.role !== UserRole.SUPER_ADMIN && (dto.role === UserRole.SUPER_ADMIN || dto.role === UserRole.HOSPITAL_ADMIN)) {
      throw new ForbiddenException("Only super administrators can assign administrative roles.");
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : undefined,
        title: dto.title,
        role: dto.role,
        active: dto.active,
        departmentId: dto.departmentId,
      },
      select: { id: true, name: true, email: true, role: true, title: true, active: true, hospitalId: true, departmentId: true },
    });
  }
}
