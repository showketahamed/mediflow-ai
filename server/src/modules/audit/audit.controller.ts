import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("audit:read")
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "action", required: false })
  async list(
    @CurrentUser() user: AuthUser,
    @Query("cursor") cursor?: string,
    @Query("action") action?: string,
  ) {
    const take = 50;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: action ? { equals: action, mode: "insensitive" } : undefined,
        user: user.hospitalId ? { hospitalId: user.hospitalId } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
    };
  }
}

