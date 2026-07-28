import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateSettingsDto } from "./settings.dto";

@ApiTags("Settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermissions("settings:read")
  async get(@CurrentUser() user: AuthUser) {
    return this.prisma.userSettings.upsert({ where: { userId: user.sub }, create: { userId: user.sub }, update: {} });
  }
  @Put() @RequirePermissions("settings:update")
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.prisma.userSettings.upsert({ where: { userId: user.sub }, create: { userId: user.sub, ...dto }, update: dto });
  }
}
