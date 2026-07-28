import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { UpsertDiagnosticDto } from "./diagnostics.dto";
import { DiagnosticsService } from "./diagnostics.service";

@ApiTags("Diagnostics")
@ApiBearerAuth()
@Controller("diagnostics")
export class DiagnosticsController {
  constructor(private readonly diagnostics: DiagnosticsService) {}
  @Get() @RequirePermissions("diagnostics:read")
  list(@CurrentUser() user: AuthUser) { return this.diagnostics.list(user); }
  @Post() @RequirePermissions("diagnostics:create")
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertDiagnosticDto) { return this.diagnostics.upsert(user, dto); }
}
